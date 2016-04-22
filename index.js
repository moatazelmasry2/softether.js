var Promise                 = require('bluebird')
var exec                    = Promise.promisify(require('child_process').exec)
var _                       = require('lodash')


var VPNCMD = function(options) {
    this.options = options
    this.softetherPath = this.parseOptionsField(options, 'softetherPath')
    this.softetherURL = this.parseOptionsField(options, 'softetherURL')
    this.softetherPort = this.parseOptionsField(options, 'softetherPort')
    this.softetherHub = this.parseOptionsField(options, 'softetherHub')
    this.softetherPassword = this.parseOptionsField(options, 'softetherPassword')
    this.vpnBasicCommand = this.softetherPath + " " + this.softetherURL + ":" + this.softetherPort + " /SERVER /HUB:" +
            this.softetherHub + " /PASSWORD:" + this.softetherPassword
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
            console.log(csv)
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


VPNCMD.prototype.listSession = function () {
    return executeCommandCsv(this.vpnBasicCommand + " /CSV /CMD SessionList", "VERTICAL")
}

VPNCMD.prototype.getSession = function (sessionName) {
    return executeCommandCsv(this.vpnBasicCommand + " /CSV /CMD SessionGet " + sessionName, "HORIZONTAL")
}

module.exports = VPNCMD