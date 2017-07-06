/**
 * Created by Bob on 7/3/2017.
 */
'use strict';

Creep.prototype.findClosestSourceKeeper = function () {
    return this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: function (object) {
            return object.owner.username === 'Source Keeper';
        }
    });
};

Creep.prototype.findClosestEnemy = function () {
    return this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: function (object) {
            return _.includes(RawMemory.segments[2], object.owner.username) === true
        }
    });
};

Creep.prototype.fleeFromHostile = function (hostile) {
    let direction = this.pos.getDirectionTo(hostile);
    direction = (direction + 3) % 8 + 1;
    if (!direction || direction === null || this.pos.x === 0 || this.pos.x === 49 || this.pos.y === 0 || this.pos.y === 49) {
        this.moveTo(25, 25);
        return true;
    }
    for (let offset = 0, dir, pos; offset < 8; offset++) {
        let dir = (direction + offset) % 8 + 1;
        let pos = this.pos.getAdjacentPosition(dir);
        if (pos.lookFor(LOOK_TERRAIN)[0] !== STRUCTURE_WALL && pos.lookFor(LOOK_CREEPS).length === 0) {
            direction = direction + offset;
            break;
        }
    }
    this.rangedAttack(hostile);
    this.move(direction);
};

Creep.prototype.attackHostile = function (hostile) {

};

Creep.prototype.healMyCreeps = function () {
    let myCreeps = this.room.find(FIND_MY_CREEPS, {
        filter: function (object) {
            return object.hits < object.hitsMax;
        }
    });
    if (myCreeps.length > 0) {
        this.say('heal', true);
        this.moveTo(myCreeps[0]);
        if (this.pos.getRangeTo(myCreeps[0]) <= 1) {
            this.heal(myCreeps[0]);
        } else {
            this.rangedHeal(myCreeps[0]);
        }
        return true;
    }
    return false;
};

Creep.prototype.healAllyCreeps = function () {
    let allyCreeps = this.room.find(FIND_HOSTILE_CREEPS, {
        filter: function (object) {
            if (object.hits === object.hitsMax) {
                return false;
            }
            return _.includes(RawMemory.segments[2], object.owner.username) === true;
        }
    });
    if (allyCreeps.length > 0) {
        this.say('heal ally', true);
        this.moveTo(allyCreeps[0]);
        let range = this.pos.getRangeTo(allyCreeps[0]);
        if (range <= 1) {
            this.heal(allyCreeps[0]);
        } else {
            this.rangedHeal(allyCreeps[0]);
        }
        return true;
    }
};

Creep.prototype.moveToHostileConstructionSites = function () {
    let constructionSite = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
        filter: function (object) {
            if (!object.owner) {
                return false;
            }
            return object.owner.username !== Memory.username;
        }
    });
    if (constructionSite !== null) {
        this.say('kcs');
        this.log('Kill constructionSite: ' + JSON.stringify(constructionSite));
        let returnCode = this.travelTo(constructionSite);
        return true;
    }
    return false;
};

Creep.prototype.handleDefender = function () {
    let hostile = this.findClosestEnemy();
    if (this.fightRampart(hostile)) {
        return true;
    }
    if (hostile !== null) {
        return this.attackHostile(hostile);
    }
    if (this.healMyCreeps()) {
        return true;
    }
    if (this.healAllyCreeps()) {
        return true;
    }
    if (this.moveToHostileConstructionSites()) {
        return true;
    }
    this.moveRandom();
    return true;
};

Creep.prototype.waitRampart = function () {
    this.say('waitRampart');
    let creep = this;
    let structure = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: function (object) {
            if (object.structureType !== STRUCTURE_RAMPART || object.pos.lookFor(LOOK_CREEPS).length !== 0) {
                return false;
            }
            return creep.pos.getRangeTo(object) > 0;
        }
    });
    if (!structure) {
        this.moveRandom();
        return true;
    }
    let returnCode = this.travelTo(structure);
    return true;
};

Creep.prototype.fightRampart = function (target) {
    if (!target) {
        return false;
    }
    let position = target.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: function (object) {
            return object.structureType === STRUCTURE_RAMPART;
        }
    });
    if (position === null) {
        return false;
    }
    let range = target.pos.getRangeTo(position);
    if (range > 3) {
        return false;
    }
    let returnCode = this.travelTo(position);
    if (returnCode === OK) {
        return true;
    }
    if (returnCode === ERR_TIRED) {
        return true;
    }
    this.log('creep_fight.fightRampart returnCode: ' + returnCode);
    let targets = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
        filter: this.room.findAttackCreeps
    });
    if (targets.length > 1) {
        this.rangedMassAttack();
    } else {
        this.rangedAttack(target);
    }
    return true;
};

Creep.prototype.flee = function (target) {
    let direction = this.pos.getDirectionTo(target);
    this.rangedAttack(target);
    direction = (direction + 3) % 8 + 1;
    let pos = this.pos.getAdjacentPosition(direction);
    let terrain = pos.lookFor(LOOK_TERRAIN)[0];
    if (terrain === 'wall') {
        direction = (Math.random() * 8) + 1;
    }
    this.move(direction);
    return true;
};

Creep.prototype.fightRanged = function (target) {
    if (this.hits < 0.5 * this.hitsMax) {
        return this.flee(target);
    }
    let range = this.pos.getRangeTo(target);
    let direction = null;
    if (range <= 2) {
        return this.flee(target);
    }
    if (range <= 3) {
        let returnCode = this.rangedAttack(target);
        return true;
    }
    let returnCode = this.travelTo(target, {range: 3});
    if (returnCode === OK) {
        return true;
    }
    if (returnCode === ERR_TIRED) {
        return true;
    }
};

Creep.prototype.siege = function () {
    this.memory.hitsLost = this.memory.hitsLast - this.hits;
    this.memory.hitsLast = this.hits;
    if (this.hits - this.memory.hitsLost < this.hits * 0.70 || this.hits < this.hitsMax * 0.70) {
        this.travelTo(new RoomPosition(25, 25, this.memory.siegePoint), {range: 15});
        return true;
    }
    let target = this.pos.findClosestStructure(FIND_HOSTILE_STRUCTURES, STRUCTURE_TOWER);
    if (target) {
        this.memory.siegeComplete = true;
    }
    if (target === null || _.includes(RawMemory.segments[2], target.owner['username']) === true) {
        target = this.pos.findClosestStructure(FIND_HOSTILE_STRUCTURES, STRUCTURE_STORAGE);
        if (target) {
            this.memory.siegeComplete = true;
        }
    }
    if (target === null || _.includes(RawMemory.segments[2], target.owner['username']) === true) {
        target = this.pos.findClosestStructure(FIND_HOSTILE_STRUCTURES, STRUCTURE_TERMINAL);
        if (target) {
            this.memory.siegeComplete = true;
        }
    }
    if (target === null || _.includes(RawMemory.segments[2], target.owner['username']) === true) {
        target = this.pos.findClosestStructure(FIND_HOSTILE_STRUCTURES, STRUCTURE_SPAWN);
        if (target) {
            this.memory.siegeComplete = true;
        }
    }
    if (target === null || _.includes(RawMemory.segments[2], target.owner['username']) === true) {
        if (!this.memory.siegeTarget || !Game.getObjectById(this.memory.siegeTarget)) {
            target = _.min(this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 6, {filter: (s) => (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) && _.includes(RawMemory.segments[2], s.owner['username']) === false}), 'hits');
        } else {
            target = Game.getObjectById(this.memory.siegeTarget);
        }
        if (target) {
            this.memory.siegeTarget = target.id;
            this.memory.siegeComplete = undefined;
        }
    }
    if (target === null || (target.owner && _.includes(RawMemory.segments[2], target.owner['username']) === true)) {
        if (!this.memory.siegeTarget || !Game.getObjectById(this.memory.siegeTarget)) {
            target = _.min(this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 25, {filter: (s) => (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) && _.includes(RawMemory.segments[2], s.owner['username']) === false}), 'hits');
        } else {
            target = Game.getObjectById(this.memory.siegeTarget);
        }
        if (target) {
            this.memory.siegeTarget = target.id;
            this.memory.siegeComplete = undefined;
        }
    }
    if (target === null) {
        let cs = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
        this.travelTo(cs);
        return false;
    }
    let path = this.pos.findPathTo(target, {
        ignoreDestructibleStructures: false,
        ignoreCreeps: false
    });
    let returnCode;
    let posLast = path[path.length - 1];
    if (path.length === 0 || !target.pos.isEqualTo(posLast.x, posLast.y)) {
        let structure = this.pos.findClosestStructure(FIND_STRUCTURES, STRUCTURE_RAMPART);
        returnCode = this.travelTo(structure);
        target = structure;
    } else {
        if (this.hits > this.hitsMax - 2000) {
            returnCode = this.moveByPath(path);
        }
    }

    let structures = target.pos.lookFor('structure');
    for (let i = 0; i < structures.length; i++) {
        if (structures[i].structureType === STRUCTURE_RAMPART) {
            target = structures[i];
            break;
        }
    }

    this.dismantle(target);
    return true;
};

Creep.prototype.squadHeal = function () {
    let range;
    let creepToHeal = this.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: function (object) {
            return object.hits < object.hitsMax / 1.5;
        }
    });

    if (creepToHeal !== null) {
        range = this.pos.getRangeTo(creepToHeal);
        if (range <= 1) {
            this.heal(creepToHeal);
        } else {
            this.rangedHeal(creepToHeal);
            this.moveTo(creepToHeal);
        }
        return true;
    }

    creepToHeal = this.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: function (object) {
            return object.hits < object.hitsMax;
        }
    });

    if (creepToHeal !== null) {
        range = this.pos.getRangeTo(creepToHeal);
        if (range > 1) {
            this.rangedHeal(creepToHeal);
        } else {
            this.heal(creepToHeal);
        }
        if (creepToHeal.id === this.id) {
            this.say('exit');
            let exit = this.pos.findClosestByRange(FIND_EXIT);
            this.moveTo(exit);
        } else {
            this.say(JSON.stringify(creepToHeal));
            this.moveTo(creepToHeal);
        }
        return true;
    }

    let attacker = this.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: function (object) {
            return object.memory.role === 'squadsiege';
        }
    });

    if (this.pos.x === 0 ||
        this.pos.x === 49 ||
        this.pos.y === 0 ||
        this.pos.y === 49
    ) {
        this.moveTo(25, 25);
        return true;
    }
    if (attacker === null) {
        var cs = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
        this.moveTo(cs);
        return false;
    }
    this.moveTo(attacker);
    return false;
};

Creep.prototype.moveRandom = function (onPath) {
    let start = Math.ceil(Math.random() * 8);
    let direction = 0;
    for (let i = start; i < start + 8; i++) {
        direction = ((i - 1) % 8) + 1;
        let pos = this.pos.getAdjacentPosition(direction);
        if (pos.isExit()) {
            continue;
        }
        if (onPath && !pos.inPath()) {
            continue;
        }
        if (pos.checkForWall()) {
            continue;
        }
        if (pos.checkForObstacleStructure()) {
            continue;
        }
        break;
    }
    this.move(direction);
};

Room.prototype.findAttackCreeps = function (object) {
    if (object.owner.username === 'Source Keeper') {
        return false;
    }

    for (var item in object.body) {
        var part = object.body[item];
        if (part.energy === 0) {
            continue;
        }
        if (part.type === 'attack') {
            return true;
        }
        if (part.type === 'ranged_attack') {
            return true;
        }
        if (part.type === 'heal') {
            return true;
        }
        if (part.type === 'work') {
            return true;
        }
        if (part.type === 'claim') {
            return true;
        }
    }
    return true;
    // TODO defender stop in rooms with (non attacking) enemies
    //    return false;
};

Room.prototype.handleNukeAttack = function () {
    let nukes = this.find(FIND_NUKES);
    if (nukes.length === 0) {
        return false;
    }

    let sorted = _.sortBy(nukes, function (object) {
        return object.timeToLand;
    });
    if (sorted[0].timeToLand < 100) {
        this.controller.activateSafeMode();
    }

    let findSaveableStructures = function (object) {
        if (object.structureType === STRUCTURE_ROAD) {
            return false;
        }
        if (object.structureType === STRUCTURE_RAMPART) {
            return false;
        }
        return object.structureType !== STRUCTURE_WALL;

    };

    let isRampart = function (object) {
        return object.structureType === STRUCTURE_RAMPART;
    };

    for (let nuke of nukes) {
        let structures = nuke.pos.findInRange(FIND_MY_STRUCTURES, 4, {
            filter: findSaveableStructures
        });
        this.log('Nuke attack !!!!!');
        for (let structure of structures) {
            let lookConstructionSites = structure.pos.lookFor(LOOK_CONSTRUCTION_SITES);
            if (lookConstructionSites.length > 0) {
                continue;
            }
            let lookStructures = structure.pos.lookFor(LOOK_STRUCTURES);
            let lookRampart = _.findIndex(lookStructures, isRampart);
            if (lookRampart > -1) {
                continue;
            }
            this.log('Build rampart: ' + JSON.stringify(structure.pos));
            structure.pos.createConstructionSite(STRUCTURE_RAMPART);
        }
    }

    return true;
};