/* 穗账达：订单与收款。订单金额与实际收款分开保存，往来余额从收款历史计算。 */
(function(global){
  'use strict';
  function cents(v){return Math.round(Number(v)*100)}
  function amount(v){return cents(v)/100}
  function sumPayments(o){return amount((o.payments||[]).reduce(function(n,p){return n+Number(p.amount||0)},0))}
  function balance(o){return Math.max(0,amount(Number(o.total||0)-sumPayments(o)))}
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!isNaN(new Date(v+'T00:00:00').getTime())}
  function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
  function ensure(s){
    if(!Array.isArray(s.orders))s.orders=[];
    s.orders.forEach(function(o){
      if(!Array.isArray(o.payments))o.payments=[];
      if(!Array.isArray(o.proofIds))o.proofIds=[];
      if(!o.status)o.status='待制作';
    });
    return s;
  }
  function validateOrder(x,paid){
    if(!String(x.party||'').trim())throw Error('请填写客户名称');
    if(!String(x.item||'').trim())throw Error('请填写商品或作品名称');
    if(!Number.isFinite(Number(x.total))||cents(x.total)<=0)throw Error('订单金额必须大于零');
    if(cents(x.total)<cents(paid||0))throw Error('订单金额不能小于已收款');
    if(!validDate(x.date))throw Error('请选择有效的下单日期');
    if(x.due&&!validDate(x.due))throw Error('请选择有效的尾款日期');
    if(x.deliveryDate&&!validDate(x.deliveryDate))throw Error('请选择有效的交付日期');
    if(cents(x.total)>cents(paid||0)&&!x.due)throw Error('还有待收款，请填写预计收款日期');
  }
  function makeSaleRecord(s,o){
    if(o.status==='已交付'){
      var r=(s.records||[]).find(function(x){return x.id===o.recordId});
      if(!r){r={id:id(),type:'in',cat:'作品销售',inv:false};s.records.push(r);o.recordId=r.id}
      r.amt=amount(o.total);r.party=o.party;r.note=o.item+(o.note?' · '+o.note:'');
      r.date=o.deliveryDate||o.date;r.orderId=o.id;
    }else if(o.recordId){
      (s.invoices||[]).forEach(function(v){if(v.sourceId===o.recordId)v.sourceId=''});
      s.records=s.records.filter(function(r){return r.id!==o.recordId});
      o.recordId=null;
    }
  }
  function createOrder(s,x){
    ensure(s);validateOrder(x,0);
    var o={id:id(),no:String(x.no||('CZ-'+Date.now())).trim(),party:String(x.party).trim(),
      phone:String(x.phone||'').trim(),item:String(x.item).trim(),craft:String(x.craft||'其他').trim(),
      total:amount(x.total),date:x.date,deliveryDate:x.deliveryDate||'',due:x.due||'',
      status:x.status||'待制作',note:String(x.note||'').trim(),payments:[],proofIds:[],recordId:null};
    if(s.orders.some(function(a){return a.no===o.no}))throw Error('订单编号已存在');
    s.orders.push(o);makeSaleRecord(s,o);return o;
  }
  function addPayment(o,x){
    if(o.status==='已取消')throw Error('订单已取消，不能继续收款');
    var v=amount(x.amount);
    if(!Number.isFinite(v)||cents(v)<=0)throw Error('收款金额必须大于零');
    if(cents(v)>cents(balance(o)))throw Error('收款金额超过待收款');
    if(!validDate(x.date))throw Error('请选择有效的收款日期');
    var p={id:id(),amount:v,date:x.date,method:String(x.method||'未填写'),note:String(x.note||'').trim()};
    o.payments.push(p);return p;
  }
  function editOrder(s,o,x){
    ensure(s);validateOrder(x,sumPayments(o));
    if(x.status==='已取消'&&o.status!=='已取消')throw Error('请使用取消订单操作');
    if(o.status==='已取消')throw Error('已取消订单不能直接修改，请新建订单');
    if(x.no!==o.no&&s.orders.some(function(a){return a.id!==o.id&&a.no===x.no}))throw Error('订单编号已存在');
    ['no','party','phone','item','craft','date','deliveryDate','due','status','note'].forEach(function(k){o[k]=String(x[k]||'').trim()});
    o.total=amount(x.total);makeSaleRecord(s,o);return o;
  }
  function cancelOrder(s,o){o.status='已取消';makeSaleRecord(s,o);return o}
  function deleteOrder(s,o){
    if((o.payments||[]).length)throw Error('已有收款历史，请取消订单并保留记录');
    s.orders=s.orders.filter(function(x){return x.id!==o.id});
    if(o.recordId){
      (s.invoices||[]).forEach(function(v){if(v.sourceId===o.recordId)v.sourceId=''});
      s.records=s.records.filter(function(r){return r.id!==o.recordId});
    }
    return true;
  }
  function arEntries(s){
    ensure(s);
    return s.orders.filter(function(o){return o.status!=='已取消'}).map(function(o){
      var left=balance(o);
      return {id:'order:'+o.id,orderId:o.id,kind:'rec',party:o.party,amt:left||Number(o.total),
        balance:left,reason:o.item,date:o.date,due:o.due||o.date,paid:left<=0};
    });
  }
  function status(o,now){
    if(o.status==='已取消')return '已取消';
    if(balance(o)<=0)return '已结清';
    return o.due&&o.due<(now||new Date().toISOString().slice(0,10))?'已逾期':'待收款';
  }
  function metrics(s,month,now){
    ensure(s);var rec=s.records||[],legacy=s.ar||[],m=month||new Date().toISOString().slice(0,7),day=now||new Date().toISOString().slice(0,10);
    var sales=0,received=0,expense=0;
    rec.forEach(function(r){
      if((r.date||'').slice(0,7)!==m)return;
      if(r.type==='out')expense+=Number(r.amt||0);
      if(r.type==='in'){
        sales+=Number(r.amt||0);
        if(!r.orderId){
          var due=legacy.filter(function(a){return a.kind==='rec'&&a.sourceId===r.id})
            .reduce(function(n,a){return n+(a.originalAmt!=null?Number(a.originalAmt):a.paid?0:Number(a.amt||0))},0);
          received+=Math.max(0,Number(r.amt||0)-due);
        }
      }
    });
    s.orders.forEach(function(o){(o.payments||[]).forEach(function(p){if((p.date||'').slice(0,7)===m)received+=Number(p.amount||0)})});
    legacy.forEach(function(a){(a.payments||[]).forEach(function(p){if((p.date||'').slice(0,7)===m)received+=Number(p.amount||0)})});
    var pending=0,overdue=0,unsettled=0;
    s.orders.forEach(function(o){if(o.status==='已取消')return;var b=balance(o);if(b>0){pending+=b;unsettled++;if(o.due&&o.due<day)overdue+=b}});
    legacy.forEach(function(a){if(a.kind==='rec'&&!a.paid){pending+=Number(a.amt||0);if(a.due&&a.due<day)overdue+=Number(a.amt||0)}});
    return {sales:amount(sales),received:amount(received),expense:amount(expense),pending:amount(pending),overdue:amount(overdue),unsettled:unsettled};
  }
  function parseSale(text,r,normalize){
    var t=normalize?normalize(text):String(text||'');
    var values=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(万|千|元|块)?/g)].map(function(m){
      return amount(Number(m[1])*(m[2]==='万'?10000:m[2]==='千'?1000:1));
    }).filter(function(n){return n>0});
    var total=r.deposit&&r.balance?amount(r.deposit+r.balance):Number(r.amt||values[0]||0);
    var received=r.deposit||0;
    var rm=t.match(/(?:已收|实收|收到|收了|微信收|现金收|支付宝收|银行收)\s*(\d+(?:\.\d+)?)\s*(万|千|元|块)?/);
    if(rm)received=amount(Number(rm[1])*(rm[2]==='万'?10000:rm[2]==='千'?1000:1));
    var bm=t.match(/(?:剩余|还欠|尾款|余款)\s*(\d+(?:\.\d+)?)\s*(万|千|元|块)?/);
    if(bm&&!r.deposit){var b=amount(Number(bm[1])*(bm[2]==='万'?10000:bm[2]==='千'?1000:1));if(!rm&&b<total)received=amount(total-b)}
    if(!rm&&!bm&&!r.deposit)received=r.credit?0:total;
    return {total:total,received:received,method:/微信/.test(t)?'微信':/支付宝/.test(t)?'支付宝':/现金/.test(t)?'现金':/银行|转账/.test(t)?'银行转账':'未填写'};
  }
  global.Biz={ensure:ensure,amount:amount,balance:balance,sumPayments:sumPayments,createOrder:createOrder,
    addPayment:addPayment,editOrder:editOrder,cancelOrder:cancelOrder,deleteOrder:deleteOrder,
    arEntries:arEntries,status:status,metrics:metrics,parseSale:parseSale};
})(window);
