/**
 * Created by Bob on 7/12/2017.
 */

module.exports.role = function (creep) {
    //INITIAL CHECKS
    if (creep.tryToBoost(['build'])) return;
    //If short on harvesters become one
    let harvesters = _.filter(creep.room.creeps, (c) => c.my && c.memory.role === 'stationaryHarvester');
    if (harvesters.length < 2) return creep.memory.role = 'stationaryHarvester';
    if (creep.wrongRoom()) return;
    if (creep.carry.energy === 0) {
        creep.memory.working = undefined;
        creep.memory.constructionSite = undefined;
        creep.memory.task = undefined;
    }
    if (_.sum(creep.carry) >= creep.carryCapacity * 0.8) creep.memory.working = true;
    if (creep.memory.working === true) {
        creep.memory.source = undefined;
        if (!creep.memory.constructionSite || !Game.getObjectById(creep.memory.constructionSite)) {
            creep.memory.constructionSite = undefined;
            creep.memory.task = undefined;
            creep.findConstruction();
        }
        if (creep.memory.task === 'build') {
            let construction = Game.getObjectById(creep.memory.constructionSite);
            switch (creep.build(construction)) {
                case OK:
                    return;
                case ERR_NOT_IN_RANGE:
                    creep.shibMove(construction, {range: 3});
                    break;
                case ERR_RCL_NOT_ENOUGH:
                    creep.memory.constructionSite = undefined;
                    creep.memory.task = undefined;
                    break;
                case ERR_INVALID_TARGET:
                    if (construction instanceof ConstructionSite) construction.remove();
                    creep.memory.constructionSite = undefined;
                    creep.memory.task = undefined;
                    break;
            }
        } else {
            creep.findRepair(creep.room.controller.level);
            if (creep.memory.task === 'repair' && creep.memory.constructionSite) {
                let repairNeeded = Game.getObjectById(creep.memory.constructionSite);
                switch (creep.repair(repairNeeded)) {
                    case OK:
                        return;
                    case ERR_NOT_IN_RANGE:
                        creep.shibMove(repairNeeded, {range: 3});
                        break;
                    case ERR_RCL_NOT_ENOUGH:
                        delete creep.memory.constructionSite;
                }
            } else {
                creep.recycleCreep();
            }
        }
    } else {
        if (creep.memory.energyDestination) {
            creep.withdrawEnergy();
        } else {
            if (!creep.requestDelivery() && !creep.findEnergy()) {
                if (creep.pos.checkForRoad()) {
                    creep.moveRandom();
                } else {
                    return creep.idleFor(15);
                }
            }
        }
    }
};