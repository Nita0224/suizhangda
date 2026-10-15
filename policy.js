/* 潮州政策线索：人工核对的官方来源快照，不是实时申报接口。 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SuizhangPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var VERIFIED='2026-10-15';
  var ITEMS=[
    {
      id:'cz-heritage-workshop',group:'heritage',title:'潮州非遗工坊建设方向',
      source:'潮州市文化广电旅游体育局《2025年工作要点》',published:'2025年',
      url:'https://www.chaozhou.gov.cn/czwgltj/gkmlpt/content/3/3949/post_3949124.html',
      status:'政策方向，未核实开放申报',validUntil:'',
      summary:'市文旅部门提出推动乡村非遗工坊建设、促进就业与增收。这是工作方向，不等于每家工坊都有补贴。',
      action:'向经营所在地的县区文旅部门询问是否有当期征集，并索取正式通知和材料清单。',
      prepare:'先整理营业执照、技艺介绍、作品照片、订单与培训或传习记录；正式材料以征集通知为准。'
    },
    {
      id:'vat-2026',group:'tax',title:'2026—2027年小规模纳税人增值税安排',
      source:'财政部、税务总局公告2026年第10号',published:'2026-01-30',
      url:'https://guangdong.chinatax.gov.cn/gdsw/zjfg/2026-02/02/content_6099dba1ef064325ac0ac9032fb2925d.shtml',
      status:'政策有效期内，需核对适用条件',validUntil:'2027-12-31',
      summary:'公告规定月销售额10万元、季销售额30万元的起征点，并规定部分适用3%征收率的应税交易减按1%征收。',
      action:'先核对小规模纳税人身份、纳税期间、应税销售额与开票情况，再请主管税务机关或会计确认。',
      prepare:'准备纳税人身份信息、各期销售及开票记录；本应用于经营记账，不能直接计算应纳税额。'
    },
    {
      id:'vat-admin-2026',group:'tax',title:'2026年增值税起征点与开票办理提示',
      source:'国家税务总局公告2026年第4号',published:'2026-01-30',
      url:'https://gtm-cn-uqm3dbhc20k.guangdong.chinatax.gov.cn/gdsw/zjfg/2026-02/02/content_dbaddbc79f234c229decd6b554ff6b34.shtml',
      status:'现行征管规定，需核对适用条件',validUntil:'',
      summary:'公告说明起征点相关征管、放弃免税开具专票以及适用减按1%征收率时的开票要求。',
      action:'若客户要求专票或需申报，先向主管税务机关或会计核对开票与申报口径。',
      prepare:'整理发票类型、销售记录及申报周期；不要仅凭账本金额判断免税资格。'
    }
  ];
  function evaluate(state,at){
    state=state||{};var p=state.profile||{},meta=state.meta||{};
    var craft=String(p.craft||'');
    var selected=String(p.policyCraft||'unknown');
    var heritage=selected==='food'||selected==='craft'||(selected==='unknown'&&
      (meta.quiz==='food'||meta.quiz==='craft'||/非遗|潮绣|手拉壶|木雕|潮瓷|陶瓷|传统食品/.test(craft)));
    var tax=String(p.policyTaxStatus||(/小规模纳税人/.test(p.method||'')?'small':/一般纳税人/.test(p.method||'')?'general':'unknown'));
    var n=(state.orders||[]).length,r=(state.records||[]).length,proof=(state.proofs||[]).length;
    var date=at||new Date().toISOString().slice(0,10);
    return ITEMS.map(function(item){
      var related=item.group==='heritage'?heritage:tax==='small';
      var relevance=item.group==='heritage'?(heritage?'与你的工艺有关':selected==='other'?'你填写的是其他经营方向':'先确认是否经营非遗相关产品'):
        tax==='small'?'与你填写的小规模纳税人身份有关':tax==='general'?'你填写的是一般纳税人；此项面向小规模纳税人':'先确认是否为小规模纳税人';
      var status=item.validUntil&&date>item.validUntil?'所列政策期已结束，须查新公告':item.status;
      return Object.assign({},item,{related:related,relevance:relevance,status:status,
        matchLabel:related?'与你有关':(selected==='other'&&item.group==='heritage'||tax==='general'&&item.group==='tax')?'当前身份不匹配':'待补资料',
        evidence:item.group==='heritage'?'本机已有 '+n+' 笔订单、'+proof+' 份作品资料；这些仅是整理线索，不等于申报材料齐全。':
          '本机已有 '+r+' 笔经营流水、'+n+' 笔订单；账本不含完整税务数据，不能据此判定税额。'});
    }).sort(function(a,b){return Number(b.related)-Number(a.related)});
  }
  return {verifiedAt:VERIFIED,items:ITEMS,evaluate:evaluate};
});
