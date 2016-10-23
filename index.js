var Promise                 = require('bluebird')
var exec                    = Promise.promisify(require('child_process').exec)
var _                       = require('lodash')


var VPNCMD = function(options) {
    this.options = {}
    this.options.softetherPath = this.parseOptionsField(options, 'softetherPath')
    this.options.softetherURL = this.parseOptionsField(options, 'softetherURL')
    this.options.softetherPort = this.parseOptionsField(options, 'softetherPort')
    this.options.softetherHub = this.parseOptionsField(options, 'softetherHub')
    this.options.softetherPassword = this.parseOptionsField(options, 'softetherPassword')
}

VPNCMD.prototype.getBasicCommand = function(options) {
    try {
        var opts = _.assign({}, this.options, options)
        return opts.softetherPath + " " + opts.softetherURL + ":" + opts.softetherPort + " /SERVER /HUB:" +
            opts.softetherHub + " /PASSWORD:" + opts.softetherPassword
    } catch (e) {
        console.error(e)
    }
}


VPNCMD.HORIZONTAL = "HORIZONTAL"
VPNCMD.VERTICAL = "VERTICAL"
function extractQuotedFields(line) {
    var fields = []
    var open = false
    var str = ""
    const isSecurityPolicy = false
    for (var i in line) {
        switch(line[i]) {
            case ",":
                if (open) {
                    str += ","
                    continue
                }
                if (str.length > 0) {
                    fields.push(str)
                    str = ""
                } else if ( (i > 0 && line[i-1] == ',' ) || i == 0) {
                    fields.push("")
                }
                break;
            case "\"":
                if (open) {
                    open = false
                    if (str.length > 0) {
                        fields.push(str)
                        str = ""
                    }
                } else {
                    open = true
                }
                break;
            case " ":
                break;
            default :
                str += line[i]
                break;
        }
    }
    if (str.length > 0) fields.push(str)
    return fields
}

function csvToJsonVertical(csv) {
    var json = []
    var tokens = csv.split("\n")
    var headers = []
    for (var i in tokens) {
        if (tokens[i].length == 0) continue
        var fields = extractQuotedFields(tokens[i])
        var entry = {}
        if (i == 0) {
            for ( field in fields) {
                headers.push(fields[field])
            }

        } else {
            for ( field in fields) {
                entry[headers[field]] = fields[field]
            }
            json.push(entry)
        }
    }
    return json
}

function csvToJsonHorizontal(csv) {
    var json = {}
    var tokens = csv.split("\n")
    let isSecurityPolicy = false
    for (var i = 1; i < tokens.length; i++) {
        if (tokens[i].includes("Security Policy Set for this User") ) {
            isSecurityPolicy = true
        }
        vals = extractQuotedFields(tokens[i])
        if (isSecurityPolicy) {
            json[vals[0]] = vals[2]
        } else {
            json[vals[0]] = vals[1]
        }
    }
    return json
}

function executeCommandCsv(command, direction) {
    //console.log("Executing command: " + command)
    return exec(command)
        .then(function (csv) {
            switch (direction) {
                case "HORIZONTAL":
                    return csvToJsonHorizontal(csv)
                case "VERTICAL":
                    return csvToJsonVertical(csv)
                default:
                    throw new Error("The direction of json parsing must be specified (HORIZONTAL|VERTICAL)")
            }

        })
}

function executeCommand(command) {
    console.log("executing command: " + command)
    return exec(command)
}

VPNCMD.prototype.parseOptionsField = function(options, fieldName) {
    if (!options[fieldName]) {
        throw new Error(fieldName + "is mandatory and must be provided")
    }
    return options[fieldName]
}


VPNCMD.prototype.listSession = function (options) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD SessionList", VPNCMD.VERTICAL)
}

VPNCMD.prototype.listUsers = function (options) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD UserList", VPNCMD.VERTICAL)
}



VPNCMD.prototype.getSession = function (options, sessionName) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD SessionGet " + sessionName, VPNCMD.HORIZONTAL)
}

VPNCMD.prototype.createUser = function(options, username, group) {
    let command = this.getBasicCommand(options) + " /CMD UserCreate " + username + " /GROUP:" + group
    command += " /REALNAME:" + username +" /NOTE:\"\""
    return executeCommand(command)
}

VPNCMD.prototype.setUserRadius = function(options, username) {
    var command = this.getBasicCommand(options) + " /CMD UserRadiusSet " + username + " /ALIAS:" + username
    return executeCommand(command)
}

VPNCMD.prototype.setUserPolicy = function(options, username, policyName, value) {
    if (_.isNil(username) || _.isNil(policyName) || _.isNil(value) || (! _.isNumber(value) && ! _.isBoolean(value) && ! _.isString(value))) {
        throw new Error("setUserPolicy. username, polciy name and value must all be set. Value is either boolean or Number")
    }
    var command = this.getBasicCommand(options) + " /CMD UserPolicySet " + username + " /NAME:" + policyName +
        " /VALUE:"
    if (_.isBoolean(value)) {
        command += value?"yes":"no"
    } else if (_.isNumber(value) || _.isString(value)) {
        command += value
    }
    return executeCommand(command)
}

VPNCMD.prototype.getUserPolicy = function(options, username, policyName) {
    if (_.isNil(username) || _.isNil(policyName) || _.isNil(value) ) {
        throw new Error("setUserPolicy. username, polciy name and value must all be set.")
    }
    var command = this.getBasicCommand(options) + " /CMD UserPolicySet " + username + " /NAME:" + policyName
    return executeCommand(command)
}

VPNCMD.prototype.deleteUser = function(options, username) {
    var command = this.getBasicCommand(options) + " /CMD UserDelete " + username
    return executeCommand(command)
}

VPNCMD.prototype.getUser= function (options, username) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD UserGet " + username, VPNCMD.HORIZONTAL)
}

VPNCMD.prototype.disconnectSession = function(options, sessionName) {
    return executeCommand(this.getBasicCommand(options) + " /CMD SessionDisconnect " + sessionName)
}

module.exports = VPNCMD