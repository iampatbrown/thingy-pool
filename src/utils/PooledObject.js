"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorMessages;
(function (ErrorMessages) {
    ErrorMessages["MUST_BE_RETURNED"] = "Object must be returned before it can be made available";
    ErrorMessages["NO_OBJECT"] = "Object must be defined";
    ErrorMessages["OBJECT_IS_INVALID"] = "Object is invalid";
    ErrorMessages["OBJECT_IS_DESTROYED"] = "Object is destroyed";
    ErrorMessages["CANT_BORROW"] = "Unable to borrow object that is not available";
})(ErrorMessages || (ErrorMessages = {}));
var ObjectState;
(function (ObjectState) {
    ObjectState[ObjectState["CREATED"] = 0] = "CREATED";
    ObjectState[ObjectState["AVAILABLE"] = 1] = "AVAILABLE";
    ObjectState[ObjectState["RETURNED"] = 2] = "RETURNED";
    ObjectState[ObjectState["VALIDATING"] = 3] = "VALIDATING";
    ObjectState[ObjectState["BORROWED"] = 4] = "BORROWED";
    ObjectState[ObjectState["INVALID"] = 5] = "INVALID";
    ObjectState[ObjectState["DESTROYED"] = 6] = "DESTROYED";
})(ObjectState || (ObjectState = {}));
var PooledObject = /** @class */ (function () {
    function PooledObject(object, getTimestamp) {
        if (getTimestamp === void 0) { getTimestamp = Date.now; }
        this._availableAt = 0;
        this._borrowedAt = 0;
        this._loanPromise = null;
        this._loanResolve = null;
        if (!object || typeof object !== 'object')
            throw new TypeError();
        this._object = object;
        this._getTimestamp = getTimestamp;
        this._state = ObjectState.CREATED;
        this._createdAt = this._getTimestamp();
    }
    PooledObject.prototype.setToAvailable = function () {
        if (this._state === ObjectState.AVAILABLE)
            return this;
        if (this._state >= ObjectState.BORROWED) {
            if (this._state === ObjectState.BORROWED)
                throw new TypeError();
            if (this._state === ObjectState.INVALID)
                throw new TypeError();
            throw new TypeError();
        }
        this._state = ObjectState.AVAILABLE;
        this._availableAt = this._getTimestamp();
        return this;
    };
    PooledObject.prototype.setToBorrowed = function () {
        var _this = this;
        if (this._state !== ObjectState.AVAILABLE)
            throw new TypeError();
        this._loanPromise = new Promise(function (resolve) {
            _this._loanResolve = resolve;
        });
        this._state = ObjectState.BORROWED;
        this._borrowedAt = this._getTimestamp();
        return this;
    };
    PooledObject.prototype.setToReturned = function () {
        if (this._state !== ObjectState.BORROWED)
            throw new TypeError();
        this._loanResolve();
        this._state = ObjectState.RETURNED;
        return this;
    };
    PooledObject.prototype.setToValidating = function () {
        if (this._state >= ObjectState.BORROWED) {
            if (this._state === ObjectState.BORROWED)
                throw new TypeError();
            if (this._state === ObjectState.INVALID)
                throw new TypeError();
            throw new TypeError();
        }
        this._state = ObjectState.VALIDATING;
        return this;
    };
    PooledObject.prototype.setToInvalid = function () {
        if (this._state === ObjectState.DESTROYED)
            throw new TypeError();
        this._state = ObjectState.INVALID;
        return this;
    };
    PooledObject.prototype.setToDestroyed = function () {
        this._state = ObjectState.DESTROYED;
        return this;
    };
    PooledObject.prototype.getObject = function () {
        return this._object;
    };
    PooledObject.prototype.getState = function () {
        return ObjectState[this._state];
    };
    PooledObject.prototype.getLoanPromise = function () {
        return this._loanPromise;
    };
    PooledObject.prototype.getIdleTime = function () {
        if (this._state !== ObjectState.AVAILABLE)
            return -1;
        return this._getTimestamp() - this._availableAt;
    };
    return PooledObject;
}());
exports.default = PooledObject;
