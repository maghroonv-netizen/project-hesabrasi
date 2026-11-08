/* Editable Excel version of the active sampling worksheet. ExcelJS is bundled
   in the HTML so a downloaded standalone file does not require a CDN. */
async function sampleBuildExcel(w,sel){
 if(typeof ExcelJS==='undefined')throw Error('ابزار ساخت فایل اکسل بارگذاری نشد.');
 const workbook=new ExcelJS.Workbook();workbook.creator='نرم‌افزار حسابرسی';workbook.calcProperties.fullCalcOnLoad=true;
 const n=Math.max(1,Math.min(15,Math.round(Number(SHEET_CFG.ctrl)||10)));
 const layout=samplePrintLayout(),cols=8+n;
 const ws=workbook.addWorksheet('کاربرگ نمونه‌گیری',{views:[{rightToLeft:true,showGridLines:false,state:'frozen',ySplit:5}],pageSetup:{paperSize:9,orientation:layout.orientation,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.25,right:0.25,top:0.3,bottom:0.4,header:0.1,footer:0.2}},headerFooter:{oddFooter:'&Cصفحه &P از &N'}});
 const widths=[7,12,16,43,40,11,20,20,...Array(n).fill(5)];widths.forEach((v,i)=>{ws.getColumn(i+1).width=v;});
 const border={top:{style:'thin',color:{argb:'FFE3D6AD'}},bottom:{style:'thin',color:{argb:'FFE3D6AD'}},left:{style:'thin',color:{argb:'FFE3D6AD'}},right:{style:'thin',color:{argb:'FFE3D6AD'}}};
 const gold='FFFFF2CC',zebra='FFFFFCF2',blue='FF0070C0',red='FFC00000';
 function style(cell,{bold=false,bg=null,size=11,align='center',color='FF1C2430',wrap=true,grid=true}={}){
  cell.font={name:'B Nazanin',size,bold,color:{argb:color}};cell.alignment={horizontal:align,vertical:'middle',wrapText:wrap,readingOrder:'rtl'};
  if(bg)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:bg}};if(grid)cell.border=border;
 }
 function merge(row,c1,c2,value,opts){ws.mergeCells(row,c1,row,c2);const c=ws.getCell(row,c1);c.value=value;style(c,opts);}
 const path=w.keyPath.map(k=>{const i=k.indexOf('|'),code=i<0?k:k.slice(0,i),title=i<0?'':k.slice(i+1);return title+(code?' ('+code+')':'');}).join(' ← ');
 const meta=[['نام واحد مورد رسیدگی: '+String(SHEET_CFG.company||''),'تاریخ تهیه: '+String(SHEET_CFG.date||'')],['موضوع: کاربرگ نمونه‌گیری — '+path,'تهیه‌کننده: '+String(SHEET_CFG.prep||'')],['تاریخ ترازنامه: '+String(SHEET_CFG.year||''),'بررسی‌کننده: '+String(SHEET_CFG.rev||'')]];
 meta.forEach((x,i)=>{merge(i+1,1,6,x[0],{bold:true,bg:gold,align:'right',size:12});merge(i+1,7,cols,x[1],{bold:true,bg:gold,align:'right',size:11});ws.getRow(i+1).height=i===1?35:24;});
 ['ردیف','سند','تاریخ','شرح','طرف حساب','عطف','بدهکار','بستانکار'].forEach((v,i)=>{ws.mergeCells(4,i+1,5,i+1);let c=ws.getCell(4,i+1);c.value=v;style(c,{bold:true,bg:gold,color:red});});
 merge(4,9,cols,'کنترل‌های حسابرسی',{bold:true,bg:gold,color:red});
 for(let i=0;i<n;i++){const c=ws.getCell(5,9+i);c.value=i+1;style(c,{bold:true,bg:gold,color:red});}
 const ctx=cpWorksheetContext(),ordered=sel.slice().sort((a,b)=>Number(a.doc)-Number(b.doc)||String(a.doc).localeCompare(String(b.doc)));
 let k=0,sd=0,sc=0;
 for(const doc of ordered)for(const r of doc.rows){
  const debit=parseAmount(r['بدهکار']),credit=parseAmount(r['بستانکار']);sd+=debit;sc+=credit;k++;
  const desc=String(r['شرح سند']||r['شرح ردیف']||'');const sub=String(r['شرح ردیف']||'');
  const model=cpWorksheetModel(r,ctx);const counterpart=model.names.length?model.names.map(v=>v+(model.names.length>1?' /':'')).join('\n'):(model.kind==='ambiguous'?'طرف حساب انتخاب نشده':'تعیین نشد');
  const row=ws.getRow(5+k),values=[k,String(doc.doc??''),String(r['تاریخ']??''),desc+(sub&&sub!==desc?'\n'+sub:''),counterpart,'',debit||null,credit||null];
  values.forEach((v,i)=>{const c=row.getCell(i+1);c.value=v;style(c,{align:i===3||i===4?'right':'center',bg:k%2===0?zebra:null,size:i===4?10:11});if(i===6||i===7)c.numFmt='#,##0;[Red](#,##0)';});
  for(let i=0;i<n;i++){const c=row.getCell(9+i);c.value='□';style(c,{bg:k%2===0?zebra:null});}
  // Editable manual row height, keeping all text visible even on mobile Excel.
  row.height=Math.min(409,Math.max(23,15*Math.max(Math.ceil((desc.length+sub.length)/35),counterpart.split('\n').reduce((a,v)=>a+Math.max(1,Math.ceil(v.length/32)),0))));
 }
 const totalRow=6+k;merge(totalRow,1,6,'جمع اقلام رسیدگی‌شده',{bold:true,bg:gold,align:'right'});
 for(const [col,sum] of [[7,sd],[8,sc]]){const c=ws.getCell(totalRow,col);const letter=col===7?'G':'H';c.value={formula:k?`SUM(${letter}6:${letter}${5+k})`:'0',result:sum};c.numFmt='#,##0;[Red](#,##0)';style(c,{bold:true,bg:gold});}
 merge(totalRow,9,cols,'',{bg:gold});
 const full=rowsForWorksheetAccount(w),sum=(arr,f)=>arr.reduce((a,r)=>a+parseAmount(r[f]),0),op=full.filter(r=>r['نوع سند']==='ابتدای سال'),cur=full.filter(r=>r['نوع سند']!=='ابتدای سال'),opNet=sum(op,'بدهکار')-sum(op,'بستانکار');
 const opD=opNet>0?opNet:0,opC=opNet<0?-opNet:0,curD=sum(cur,'بدهکار'),curC=sum(cur,'بستانکار'),end=opD-opC+curD-curC;
 const start=totalRow+2;merge(start,1,cols,'تفکیک گردش و مانده',{bold:true,bg:gold,align:'right',color:red});
 const hdr=start+1;[['تفکیک',1,4],['بدهکار',5,5],['درصد',6,6],['بستانکار',7,7],['درصد',8,cols]].forEach(([v,a,b])=>{if(a===b){const c=ws.getCell(hdr,a);c.value=v;style(c,{bold:true,bg:gold});}else merge(hdr,a,b,v,{bold:true,bg:gold});});
 const rows=[['افتتاحیه (مانده ابتدای سال)',opD,opC],['اقلام رسیدگی‌شده',sd,sc],['سایر اقلام (رسیدگی‌نشده)',curD-sd,curC-sc],['جمع',opD+curD,opC+curC]];
 rows.forEach((r,i)=>{const ri=hdr+1+i;merge(ri,1,4,r[0],{bold:i===3,bg:i===3?gold:null,align:'right'});
  const dc=ws.getCell(ri,5),cc=ws.getCell(ri,7);dc.value=r[1];cc.value=r[2];
  if(i===1){dc.value={formula:`G${totalRow}`,result:r[1]};cc.value={formula:`H${totalRow}`,result:r[2]};}
  if(i===2){dc.value={formula:`${curD}-E${hdr+2}`,result:r[1]};cc.value={formula:`${curC}-G${hdr+2}`,result:r[2]};}
  if(i===3){dc.value={formula:`SUM(E${hdr+1}:E${hdr+3})`,result:r[1]};cc.value={formula:`SUM(G${hdr+1}:G${hdr+3})`,result:r[2]};}
  [dc,cc].forEach(c=>{c.numFmt='#,##0;[Red](#,##0)';style(c,{bold:i===3,bg:i===3?gold:null});});
  const dp=ws.getCell(ri,6);dp.value={formula:`IF(E${hdr+4}>0,E${ri}/E${hdr+4},"")`,result:(opD+curD)>0?r[1]/(opD+curD):''};dp.numFmt='0.0%';style(dp,{bg:i===3?gold:null});
  merge(ri,8,cols,'',{bg:i===3?gold:null});const cp=ws.getCell(ri,8);cp.value={formula:`IF(G${hdr+4}>0,G${ri}/G${hdr+4},"")`,result:(opC+curC)>0?r[2]/(opC+curC):''};cp.numFmt='0.0%';
 });
 const balance=hdr+5;merge(balance,1,4,'مانده در پایان سال مالی',{bold:true,bg:gold,align:'right',color:red});merge(balance,5,cols,'',{bold:true,bg:gold,align:'right',color:red});ws.getCell(balance,5).value={formula:`E${hdr+4}-G${hdr+4}`,result:end};ws.getCell(balance,5).numFmt='#,##0;[Red](#,##0)';
 ws.pageSetup.printArea=`A1:${ws.getColumn(cols).letter}${balance}`;
 return workbook;
}
async function sampleDownloadExcel(index){
 try{
  const entry=SHEET_OUT[index];if(!entry)throw Error('کاربرگ انتخاب‌شده پیدا نشد.');
  const workbook=await sampleBuildExcel(entry.w,entry.sel);const data=await workbook.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download='کاربرگ-نمونه‌گیری.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){alert('ساخت فایل اکسل انجام نشد: '+(e.message||String(e)));}
}
