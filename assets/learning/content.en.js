// Every learning string lives here so a Spanish file can be added beside it.
// Templates use {name} placeholders filled by t().
export const NAMES=['Maya','Mr. Lee','Nia','Mr. Ortiz','Kai','Ms. Rivera','Sam','Ava'];
export const FOODS=['veggie wrap','tomato soup','fruit cup','taco','grilled cheese','rice bowl'];
export const GOODS=['notebook','storybook','puzzle','backpack','pencil case','water bottle'];
export const GOAL_ITEMS=['bike','art set','soccer ball','skateboard','telescope'];
export const COINS=[
  {id:'penny',name:'penny',plural:'pennies',value:1},
  {id:'nickel',name:'nickel',plural:'nickels',value:5},
  {id:'dime',name:'dime',plural:'dimes',value:10},
  {id:'quarter',name:'quarter',plural:'quarters',value:25},
  {id:'half',name:'half-dollar',plural:'half-dollars',value:50}
];
export const BILLS=[{value:100,name:'$1 bill'},{value:500,name:'$5 bill'},{value:1000,name:'$10 bill'},{value:2000,name:'$20 bill'}];

export const TEXT={
  // coins.value
  'coins.value.p1':'Which coin is worth {value}?',
  'coins.value.p2':'How many {plural} make $1.00?',
  'coins.value.p3':'You have {list}. How much money is that?',
  'coins.value.p5':'What is the fewest number of coins that make {amount}?',
  'coins.value.h1':'Look at the number on each coin: a penny is 1¢, a nickel 5¢, a dime 10¢, a quarter 25¢.',
  'coins.value.h2':'Count by each coin’s value, starting with the biggest coin.',
  'coins.value.h1.fewest':'Use the biggest coin that fits first, then the next biggest.',
  'coins.value.h2.fewest':'Start with quarters: how many fit in {amount}? Then dimes, nickels, pennies.',
  // coins.count
  'coins.count.p':'A customer hands you {list}. How much did they give you?',
  'coins.count.h1':'Count the bills first, then the coins.',
  'coins.count.h2':'Bills make {bills}. Now add the coins to that.',
  // change.make
  'change.make.p':'{name} buys something for {price} and pays with {paid}. How much change do they get?',
  'change.make.h1':'Count up from the price to the money paid.',
  'change.make.h2':'Change = money paid minus price: {paid} − {price}.',
  // prices.add
  'prices.add.p':'Your basket has {list}. What is the total?',
  'prices.add.p.sale':'Your basket has {list}. The {item} is {pct}% off. What is the total now?',
  'prices.add.h1':'Add the dollars first, then the cents.',
  'prices.add.h2':'Line up the prices and add them one at a time: {steps}.',
  'prices.add.h2.sale':'{pct}% off {price} saves {save}. Use the new price in the total.',
  // afford.compare
  'afford.compare.p1':'You have {wallet}. Is that enough for a {price} {item}?',
  'afford.compare.p.more':'You have {wallet}. The {item} costs {price}. How much more money do you need?',
  'afford.compare.p.left':'You have {wallet}. You buy {list}. How much money is left?',
  'afford.compare.p.short':'You have {wallet}. Your basket is {list}. How much more do you need?',
  'afford.compare.h1':'Compare the money you have with the price.',
  'afford.compare.h2':'Subtract the smaller amount from the bigger one: {big} − {small}.',
  'yes':'Yes','no':'No',
  // biz.profit
  'biz.profit.p1':'You spent {cost} on supplies and sold everything for {sales}. How much profit did you make?',
  'biz.profit.p2':'You spent {cost} on supplies and sold {n} items at {price} each. What is your profit?',
  'biz.profit.p4':'Supplies cost {cost}. Each customer pays {price}. How many customers do you need to earn back the supplies?',
  'biz.profit.p5':'Plan A costs {costA} and serves {nA} customers at {priceA}. Plan B costs {costB} and serves {nB} customers at {priceB}. Which plan makes more profit?',
  'biz.profit.planA':'Plan A','biz.profit.planB':'Plan B','biz.profit.same':'They are the same',
  'biz.profit.h1':'Profit = money from sales minus money spent.',
  'biz.profit.h2':'Sales are {sales}. Subtract the cost: {sales} − {cost}.',
  'biz.profit.h1.even':'Keep adding one customer’s payment until you reach the supply cost.',
  'biz.profit.h2.even':'{price} × {n} = {total}. Is that enough yet?',
  // save.goal
  'save.goal.p1':'A {item} costs {goal}. You save {save} each day. How many days until you can buy it?',
  'save.goal.p2':'A {item} costs {goal}. You already have {have}. You save {save} each week. How many weeks until you can buy it?',
  'save.goal.p4':'You earn {earn} each week and save half. The {item} costs {goal}. How many weeks until you can buy it?',
  'save.goal.p5':'You earn {earn} each week and save {pct}% of it. The {item} costs {goal}. How many weeks until you can buy it?',
  'save.goal.h1':'Find how much you still need, then see how many saves it takes.',
  'save.goal.h2':'You need {need}. Count by {save}: how many times until you reach it?',
  // budget.plan
  'budget.plan.p1':'You have {total}. You plan {a} for supplies and {b} for treats. How much is not planned yet?',
  'budget.plan.p2':'You have {total}. You plan {a} for supplies, {b} for car care and {c} for fun. How much is left to plan?',
  'budget.plan.p4':'You get {total} this week and want to save {pct}% of it. How much goes into savings?',
  'budget.plan.p5':'Your {total} plan: home {home}, food {food}, fun {fun}, savings {save}. A {bill} repair comes up. Fun money pays first and savings cover the rest. How much is left in savings?',
  'budget.plan.h1':'Add up everything you planned, then subtract from what you have.',
  'budget.plan.h2':'Planned so far: {planned}. {total} − {planned} = ?',
  'budget.plan.h1.pct':'{pct}% means {pct} out of every 100.',
  'budget.plan.h2.pct':'Find 1% first ({one}), then multiply by {pct}.',
  'budget.plan.h1.bill':'Use all the fun money first, then take the rest from savings.',
  'budget.plan.h2.bill':'The repair is {bill}. Fun covers {fun}, so savings pay {rest}.',
  // risk.choose
  'risk.choose.p1':'You can have 2 stickers for sure, or flip a coin for 3 stickers or none. Which choice always gives you stickers?',
  'risk.choose.sure':'The sure 2 stickers','risk.choose.flip':'The coin flip','risk.choose.both':'Both do',
  'risk.choose.p2':'Which Garden Club plan never shrinks, whatever the weather?',
  'risk.choose.p3':'You put {start} into the Weather Garden. Half the time it grows 30%, half the time it shrinks 20%. What could you have after one season?',
  'risk.choose.p4':'You have {start} and need {goal} in {n} seasons. Which plan is sure to get there?',
  'risk.choose.p5':'In the Weather Garden, half the time you end with {a} and half the time with {b}. What is the average result?',
  'plan.jar':'Seed Jar','plan.steady':'Steady Garden','plan.weather':'Weather Garden','plan.none':'None of them',
  'risk.choose.h1':'Think about the worst thing that could happen with each choice.',
  'risk.choose.h2':'A plan that can shrink can end below where it started.',
  'risk.choose.h1.calc':'Work out each result on its own.',
  'risk.choose.h2.calc':'30% of {start} is {up}. 20% of {start} is {down}.',
  'risk.choose.h1.avg':'The average is halfway between the two results.',
  'risk.choose.h2.avg':'Add them and split in half: ({a} + {b}) ÷ 2.',
  'risk.choose.h2.goal':'The Seed Jar grows 2% every season and never shrinks. Does it reach {goal}?',
  // borrow.cost
  'borrow.cost.p1':'You can pay {now} now, or {pay} a week for {n} weeks. Which costs more in total?',
  'borrow.cost.now':'Paying now','borrow.cost.weekly':'Paying weekly','borrow.cost.same':'They cost the same',
  'borrow.cost.p2':'You pay {pay} a week for {n} weeks. How much do you pay in total?',
  'borrow.cost.p3':'A {item} needs {down} down, then {n} payments of {pay}. What is the total cost?',
  'borrow.cost.p4':'A {item} costs {price} with cash, or {down} down plus {n} payments of {pay}. How much extra do the payments cost?',
  'borrow.cost.p5':'You borrow {principal} at {rate}% simple interest per year for {years} years. How much interest do you pay?',
  'borrow.cost.h1':'Add up every payment, including the first one.',
  'borrow.cost.h2':'{n} × {pay} = {total}.',
  'borrow.cost.h2.extra':'Total with payments: {total}. Subtract the cash price {price}.',
  'borrow.cost.h1.int':'Simple interest = amount × rate × years.',
  'borrow.cost.h2.int':'{rate}% of {principal} is {yearly} each year. Multiply by {years}.',
  // read.detail
  'read.detail.p1':'{name} says, “I’d like {a} {item}, please.” What should you get?',
  'read.detail.p2':'{name} looks at the {other} but asks for the {item}. What should you get?',
  'read.detail.p3':'{name} wants {n} {item}s and {m} {other}s. How many {item}s should you get?',
  'read.detail.p4':'{name} first asks for the {other}, then says, “Actually, the {item} instead.” What should you get?',
  'read.detail.p5':'{name} has {wallet} and brings {kids} friends. {name} buys {n} {item}s at {price} each. How much is spent?',
  'read.detail.h1':'Read the order again and find the exact words.',
  'read.detail.h2':'Ignore what {name} looked at. What did {name} ask for?',
  'read.detail.h2.change':'The last thing {name} says is the order.',
  'read.detail.h2.count':'Find the number right before “{item}”.',
  'read.detail.h2.spend':'Only the items bought matter: {n} × {price}.',
  // time.order
  'time.order.p1':'You have a pet visit at {a} and a plant visit at {b}. Which comes first?',
  'time.order.p2':'Your jobs today are at {list}. Which time is second?',
  'time.order.p3':'You start a job at {start}. It takes {len} minutes. What time do you finish?',
  'time.order.p4':'You start at {start}. You do a {a}-minute job, then a {b}-minute job. What time do you finish?',
  'time.order.p5':'You start at {start}. You have {n} jobs of {len} minutes, with a {walk}-minute walk between each. What time do you finish?',
  'time.order.pet':'Pet visit','time.order.plant':'Plant visit',
  'time.order.h1':'Earlier times come first in the day.',
  'time.order.h2':'Put the times in order from earliest to latest.',
  'time.order.h1.add':'Add the minutes to the start time.',
  'time.order.h2.add':'Total time is {total} minutes. Count forward from {start}.',
  // solution line shared by all
  'solution':'The answer is {answer}.',
  // Parent view: real-life practice for a stuck skill
  'home.coins.value':'Empty a coin jar together and sort the coins by value.',
  'home.coins.count':'Hand them a few bills and coins and ask how much is there.',
  'home.change.make':'At the store, let them pay for a small snack with a $5 bill and count the change.',
  'home.prices.add':'At the grocery store, ask them to add up three items before checkout.',
  'home.afford.compare':'Give a small budget for a treat and let them decide what fits.',
  'home.biz.profit':'Plan a lemonade stand: list what supplies cost and what one cup should sell for.',
  'home.save.goal':'Pick something they want and work out together how many weeks of saving it takes.',
  'home.budget.plan':'Split an allowance into save, spend and share jars.',
  'home.risk.choose':'Flip a coin 20 times and tally the results. Talk about why one flip can surprise you.',
  'home.borrow.cost':'Look at a “pay over time” price online and add up the payments together.',
  'home.read.detail':'Let them read a menu and order for the table.',
  'home.time.order':'Ask them to plan the time you need to leave for an appointment.',
  'parent.title':'Parent progress','parent.pinPrompt':'Enter the parent PIN','parent.pinWrong':'That PIN does not match.',
  'parent.noPin':'No parent PIN is set. Set one so only a grown-up can change these settings.',
  'parent.summary':'{name} · {tier} · {questions} questions answered, {rate}% right on the first try',
  'parent.stuck':'Stuck on','parent.none':'Nothing stuck right now.','parent.tryHome':'Try at home',
  'parent.money':'Money choices','parent.suggest':'The warm-up check suggests the {tier} tier. You can switch below.',
  // UI
  'ui.check':'Check','ui.typeAnswer':'Type your answer','ui.tryAgain':'Not yet. Try again.',
  'ui.correct':'That’s right!','ui.hint':'Hint','ui.workedTitle':'Here is how to solve it',
  'ui.enterIt':'Now enter the answer yourself.','ui.recount':'“Hmm, I think that is not quite right,” says {name}. Let’s count again.',
  'ui.workedExample':'Let’s look at one together first.',
  'status.new':'New','status.practicing':'Practicing','status.mastered':'Mastered','status.review':'Needs review'
};
export function t(key,vars={}){
  const tpl=TEXT[key];
  if(tpl===undefined)return key;
  return tpl.replace(/\{(\w+)\}/g,(m,k)=>vars[k]!==undefined?String(vars[k]):m);
}
