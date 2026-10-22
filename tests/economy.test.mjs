import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../assets/economy.js';
import * as L from '../assets/money-life.js';

test('sprout is the original story economy and the default tier',()=>{
  E.setEconomyTier('nope');
  assert.equal(E.economyTier(),'sprout');
  assert.equal(E.core('startWallet'),500);
  assert.equal(E.core('restock'),200);
  assert.deepEqual([0,1,2].map(i=>E.goalTarget(i)),[600,500,800]);
  assert.equal(E.rentPrice(),200);
  assert.deepEqual(E.homePurchase(),{price:1000,down:500,installment:100});
  assert.equal(E.moneyUnit(),1);
  for(const k of Object.keys(E.FACTORS))assert.equal(E.factor(k,'sprout'),1,k);
});

test('core money keeps the same days-to-goal pacing in every tier',()=>{
  for(const tier of E.ECONOMY_TIERS){
    const f=E.factor('core',tier);
    for(const [key,value] of Object.entries(E.CORE))assert.equal(E.core(key,tier),value*f,tier+' '+key);
    for(let i=0;i<3;i++){
      const ratio=E.goalTarget(i,tier)/(E.core('starterSale',tier)*3-E.core('restock',tier));
      assert.equal(ratio,E.GOAL_TARGETS[i]/(E.CORE.starterSale*3-E.CORE.restock),tier+' goal '+i);
    }
  }
});

test('rent and the home purchase stay within twice the original pacing',()=>{
  const dayProfit=t=>E.core('starterSale',t)*3-E.core('restock',t);
  const base=E.rentPrice('sprout')/dayProfit('sprout'),down=E.homePurchase('sprout').down/dayProfit('sprout');
  for(const tier of E.ECONOMY_TIERS){
    const r=E.rentPrice(tier)/dayProfit(tier)/base,d=E.homePurchase(tier).down/dayProfit(tier)/down;
    assert.ok(r>=.5&&r<=2,tier+' rent '+r);
    assert.ok(d>=.5&&d<=2,tier+' down '+d);
    const h=E.homePurchase(tier);assert.ok(h.price>h.down&&h.installment>0);
  }
});

test('conversion is exact for whole factors and reverses',()=>{
  assert.equal(E.convertCents(500,'core','sprout','planner'),50000);
  assert.equal(E.convertCents(50000,'core','planner','sprout'),500);
  assert.equal(E.convertCents(125,'courier','sprout','planner'),2500);
  assert.equal(E.convertCents(1234,'core','builder','builder'),1234);
  assert.equal(E.convertCents(333,'core','planner','sprout'),3);
  assert.equal(E.convertDollars(5,'core','sprout','builder'),50);
  assert.equal(E.convertDollars(1.25,'core','sprout','planner'),125);
  assert.equal(E.convertCents(100,'core','sprout','bogus'),100);
  for(const cat of Object.keys(E.FACTORS))for(const a of E.ECONOMY_TIERS)for(const b of E.ECONOMY_TIERS){
    const up=E.convertCents(777,cat,'sprout',a);
    assert.equal(E.convertCents(E.convertCents(up,cat,a,b),cat,b,a),up,cat+' '+a+'→'+b);
  }
});

test('money formatting',()=>{
  assert.equal(E.formatMoney(0),'$0.00');
  assert.equal(E.formatMoney(123456),'$1,234.56');
  assert.equal(E.formatMoney(-250),'-$2.50');
  assert.equal(E.formatMoney(200,{short:true}),'$2');
  assert.equal(E.formatMoney(2500000,{short:true}),'$25,000');
  assert.equal(E.formatMoney(125,{short:true}),'$1.25');
  assert.equal(E.formatMoney(50,{short:true}),'50¢');
  assert.equal(E.formatDollars(1.1),'$1.10');
});

test('change trays fit each tier and are sorted',()=>{
  for(const tier of E.ECONOMY_TIERS){
    const tray=E.changeDenominations(tier),values=tray.map(d=>d.value);
    assert.ok(tray.length>=6);
    assert.deepEqual([...values].sort((a,b)=>a-b),values);
    // Every possible starter-plan sale can be paid back from the tray.
    assert.ok(values[0]<=E.core('starterSale',tier)/4,tier);
  }
  assert.equal(E.changeDenominations('sprout').at(-1).value,1000);
  assert.equal(E.changeDenominations('planner').at(-1).value,10000);
});

test('week and month boundaries',()=>{
  assert.equal(E.weekIndex(1),0);assert.equal(E.weekIndex(7),0);assert.equal(E.weekIndex(8),1);
  assert.deepEqual([1,7,8,9,15].map(E.isWeekStart),[false,false,true,false,true]);
  assert.deepEqual([8,15,22,29,36].map(E.isMonthStart),[true,false,false,false,true]);
});

test('savings interest: none for Sprout, weekly for Builder and Planner',()=>{
  const s=L.freshMoneyLife();
  assert.equal(L.weeklyTick(s,{businessDay:8,tier:'sprout',saved:5000}).saved,5000);
  const b=L.weeklyTick(s,{businessDay:8,tier:'builder',saved:5000});
  assert.equal(b.saved,5100);assert.equal(b.state.interestEarned,100);assert.equal(b.events[0].kind,'savings');
  const p=L.weeklyTick(s,{businessDay:15,tier:'planner',saved:100000});
  assert.equal(p.saved,100000+1000+1010);assert.equal(p.state.lastWeek,2);
  // Re-running the same day changes nothing.
  assert.deepEqual(L.weeklyTick(p.state,{businessDay:15,tier:'planner',saved:p.saved}).events,[]);
});

test('planner paycheck withholds tax on payday; other tiers pay now',()=>{
  let s=L.freshMoneyLife();
  const now=L.earnPay(s,{label:'Delivery',gross:1250,day:2},'builder');
  assert.equal(now.paidNow,1250);assert.equal(now.state,s);
  for(const g of [2500,6500]){const r=L.earnPay(s,{source:'courier',label:'Delivery',gross:g,day:3},'planner');assert.equal(r.paidNow,0);s=r.state}
  assert.equal(L.pendingPay(s),9000);
  const mid=L.weeklyTick(s,{businessDay:7,tier:'planner'});assert.equal(mid.walletChange,0);
  const pay=L.weeklyTick(s,{businessDay:8,tier:'planner'});
  assert.equal(pay.walletChange,8100);assert.equal(pay.state.taxPaid,900);
  const stub=pay.events.find(e=>e.kind==='paycheck').stub;
  assert.deepEqual([stub.gross,stub.tax,stub.net,stub.lines.length],[9000,900,8100,2]);
  assert.equal(pay.state.payroll.pending.length,0);
});

test('loan interest, car loans and bills are planner-only and never auto-paid',()=>{
  let s=L.freshMoneyLife();
  assert.equal(L.financeTerms(400000,'builder'),null);
  const t=L.financeTerms(400000,'planner');assert.deepEqual(t,{price:400000,down:80000,loan:320000,rate:.01});
  s=L.startCarLoan(s,'used',t.loan);
  const w1=L.weeklyTick(s,{businessDay:8,tier:'planner',homeLoan:2400000,housed:true});
  assert.equal(w1.homeLoan,2412000);assert.equal(w1.state.carLoan.balance,323200);
  assert.deepEqual(w1.state.bills.map(b=>b.id),['phone','utilities']);
  assert.equal(L.billsDue(w1.state),20000);assert.equal(w1.walletChange,0);
  const unhoused=L.weeklyTick(L.freshMoneyLife(),{businessDay:8,tier:'planner'});
  assert.deepEqual(unhoused.state.bills.map(b=>b.id),['phone']);
  assert.equal(L.weeklyTick(L.freshMoneyLife(),{businessDay:8,tier:'builder',homeLoan:5000,housed:true}).homeLoan,5000);
  const short=L.payBill(w1.state,0,100);assert.equal(short.ok,false);
  const paid=L.payBill(w1.state,0,10000);assert.equal(paid.ok,true);assert.equal(paid.wallet,5000);assert.equal(paid.state.bills.length,1);
  const part=L.payCarLoan(w1.state,100000,150000);assert.equal(part.state.carLoan.balance,223200);assert.equal(part.wallet,50000);
  const all=L.payCarLoan(part.state,999999,999999);assert.equal(all.cost,223200);assert.equal(all.state.carLoan,null);
});

test('money life survives a save round trip and rejects bad data',()=>{
  let s=L.earnPay(L.freshMoneyLife(),{label:'Delivery',gross:2500,day:3},'planner').state;
  s=L.weeklyTick(L.startCarLoan(s,'used',320000),{businessDay:8,tier:'planner',housed:true}).state;
  assert.deepEqual(L.restoreMoneyLife(JSON.parse(JSON.stringify(s))),s);
  assert.deepEqual(L.restoreMoneyLife({version:1,bills:[{id:'x',amount:5}],carLoan:{balance:-4},payroll:{stubs:[{gross:10,tax:20,net:-10}]}}),L.freshMoneyLife());
  assert.deepEqual(L.restoreMoneyLife(null),L.freshMoneyLife());
});

test('leaving planner converts amounts and pays out waiting pay',()=>{
  let s=L.earnPay(L.freshMoneyLife(),{label:'Delivery',gross:2500,day:3},'planner').state;
  s=L.startCarLoan(s,'used',320000);
  const r=L.convertMoneyLife(s,'planner','builder');
  assert.equal(r.walletChange,1250);assert.equal(r.state.payroll.pending.length,0);
  assert.equal(r.state.carLoan.balance,3200);
  const same=L.convertMoneyLife(s,'planner','planner');assert.equal(same.walletChange,0);assert.equal(same.state,s);
});
