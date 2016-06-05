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
    var opts = _.assign({}, this.options, options)
    return opts.softetherPath + " " + opts.softetherURL + ":" + opts.softetherPort + " /SERVER /HUB:" +
        opts.softetherHub + " /PASSWORD:" + opts.softetherPassword
}

function extractQuotedFields(line) {
    var fields = []
    var open = false
    var str = ""
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
    for (var i = 1; i < tokens.length; i++) {
        vals = extractQuotedFields(tokens[i])
        json[vals[0]] = vals[1]
    }
    return json
}

function executeCommandCsv(command, direction) {
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


VPNCMD.prototype.parseOptionsField = function(options, fieldName) {
    if (!options[fieldName]) {
        throw new Error(fieldName + "is mandatory and must be provided")
    }
    return options[fieldName]
}


VPNCMD.prototype.listSession = function (options) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD SessionList", "VERTICAL")
}

VPNCMD.prototype.getSession = function (sessionName, options) {
    return executeCommandCsv(this.getBasicCommand(options) + " /CSV /CMD SessionGet " + sessionName, "HORIZONTAL")
}

VPNCMD.prototype.createUser = function(username, group, options) {
    var command = this.getBasicCommand(options) + " /CMD UserCreate " + username + " /GROUP:" + group +
        " /REALNAME:" + username +" /NOTE:\"\""
    return exec(command)
}

VPNCMD.prototype.setUserRadius = function(username, options) {
    var command = this.getBasicCommand(options) + " /CMD UserRadiusSet " + username + " /ALIAS:" + username
    return exec(command)
}

VPNCMD.prototype.disconnectSession = function(sessionName, options) {
    return exec(this.getBasicCommand(options) + " /CMD SessionDisconnect " + sessionName)
}

module.exports = VPNCMD