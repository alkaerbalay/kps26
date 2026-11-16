import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReport,availableReports} from '../src/report-data.mjs';
const data={role:'admin',settings:{currency:'د.ع'},products:[{id:1,name:'اسم حالي',sku:'A',category:'ألواح',price:'25',cost:'10',stock:8,minimum:2,unit:'قطعة'}],customers:[{id:1,name:'عميل'}],documents:[
 {id:1,number:'INV-1',kind:'invoice',customerId:1,customerName:'عميل',createdAt:'2026-10-01T12:00:00Z',currency:'د.ع',total:'100',paid:'40',status:'partial',items:[{productId:1,name:'اسم تاريخي',quantity:4,price:25,cost:10,unit:'قطعة'}]},
 {id:2,number:'INV-2',kind:'invoice',customerId:1,customerName:'عميل',createdAt:'2026-11-05T12:00:00Z',currency:'د.ع',total:'50',paid:'0',status:'unpaid',items:[{productId:1,name:'اسم تاريخي',quantity:2,price:25,cost:10,unit:'قطعة'}]},
 {id:3,number:'INV-USD',kind:'invoice',customerId:1,createdAt:'2026-11-05T12:00:00Z',currency:'USD',total:'500',paid:'500',status:'paid',items:[]},
 {id:4,number:'QT-1',kind:'quote',customerId:1,createdAt:'2026-11-05T12:00:00Z',currency:'د.ع',total:'900',paid:'0',status:'active',items:[]}
],entries:[{id:1,kind:'income',amount:'40',documentId:1,description:'دفعة',createdAt:'2026-11-10T12:00:00Z'},{id:2,kind:'expense',amount:'10',description:'مصروف',createdAt:'2026-11-11T12:00:00Z'}],movements:[],audit:[]};
const filters={type:'summary',currency:'د.ع',from:'',to:'',customer:'',product:'',status:''};
test('invoice totals exclude quotations and other currencies',()=>{const r=makeReport(data,filters);assert.equal(r.sales,150);assert.equal(r.due,110);assert.equal(r.profit,90);assert.equal(r.count,2)});
test('date filters include the end day and exclude older invoices',()=>{const r=makeReport(data,{...filters,from:'2026-11-05',to:'2026-11-05'});assert.equal(r.sales,50);assert.equal(r.count,1)});
test('item reports preserve captured names and quantities after catalog edits',()=>{const r=makeReport(data,{...filters,type:'items'});assert.equal(r.sections[0].rows[0][0],'اسم تاريخي');assert.equal(r.sections[0].rows[0][2],6);assert.equal(r.sections[0].rows[0][4],'150')});
test('sales reports omit profit columns and never offer financial reports',()=>{const r=makeReport({...data,role:'sales'},{...filters,type:'items'});assert.equal(r.sections[0].columns.length,5);assert.ok(!availableReports('sales').includes('cash'));assert.ok(!availableReports('warehouse').includes('summary'))});
test('customer ledger includes receipts for invoices issued before the period',()=>{const r=makeReport(data,{...filters,type:'customers',customer:'1',from:'2026-11-01',to:'2026-11-15'});const rows=r.sections[1].rows;assert.equal(rows[0][6],'100');assert.equal(rows[1][4],'50');assert.equal(rows[2][5],'40');assert.equal(rows.at(-1)[6],'110')});
test('aging uses invoice age and current outstanding balance',()=>{const r=makeReport(data,{...filters,type:'aging'},new Date('2026-11-16T12:00:00Z'));assert.equal(r.sections[0].rows[0][4],'60');assert.equal(r.sections[0].rows[1][3],'50')});
test('inventory is current even when a historical date filter remains selected',()=>{const r=makeReport(data,{...filters,type:'inventory',from:'2030-01-01'});assert.equal(r.sections[0].rows[0][3],8)});
