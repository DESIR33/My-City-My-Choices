import assert from 'node:assert/strict';
import {vehicleSignalState,pedestrianSignalState,SIGNAL_CYCLE} from '../assets/traffic-signals.js';

for(let time=0;time<SIGNAL_CYCLE*3;time+=.05) {
  const ns=vehicleSignalState('NS',time),ew=vehicleSignalState('EW',time);
  assert.ok(ns==='red'||ew==='red','Cross traffic never receives two permissive signals');
  for(const axis of ['NS','EW']) {
    assert.equal(pedestrianSignalState(axis,time)==='walk',vehicleSignalState(axis,time)==='green','The pedestrian face agrees with parallel traffic');
    const cross=axis==='NS'?'EW':'NS';
    if(pedestrianSignalState(axis,time)==='walk')assert.equal(vehicleSignalState(cross,time),'red','Crossing vehicles remain stopped during WALK');
  }
}
for(const [time,ns,ew] of [[0,'green','red'],[8,'amber','red'],[10,'red','red'],[11,'red','green'],[19,'red','amber'],[21,'red','red'],[22,'green','red']]) {
  assert.equal(vehicleSignalState('NS',time),ns);assert.equal(vehicleSignalState('EW',time),ew);
}
console.log('Traffic signal phases passed: aligned pedestrian directions, protected cross traffic, amber and all-red intervals.');
