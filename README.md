softether
============

This module is a wrapper around the vpncmd utility of softether. It allows using nodejs to manipulate SoftEther server

```
npm i --save softether

```

#### Initialization ####

```javascript
var VPNCMD              = require('softether')
var vpncmd = new VPNCMD({
    "softetherPath" : "/usr/local/vpnserver/vpncmd",
    "softetherURL" : "MYSERVER_URL",
    "softetherPort" : "443",
    "softetherPassword" : "password",
    "softetherHub" : "MY_HUB_NAME"
})
```

#### Functions ####

- [listSession() : object](#listSession)
- [getSession(sessionName) : string](#getSession)


<a name="listSession"></a>
listSession(): object

Returns a json object

```javascript
vpncmd.listSession()
    .then(function (result) {
        console.log(result)
    })
```

<a name="getSession"></a>
getSession(sessionName): object

Returns a json object

```javascript
vpncmd.getSession("MY_SOFTETHER_SESSION_NAME")
    .then(function (result) {
        console.log(result)
    })
```




