red-queen-irc-proxy
---------------
I can give you the code, but first you must do something for me.

In order to use my IRC REST proxy interface, you must first acquire an API key from tylercrumpton.

After acquring a key, simply make an HTTPS GET request as follows:

```
curl --data '{"message":"My message", "channel":"#makerslocal", "isaction":false, "key":"13371234"}' https://restirc.tylercrumpton.com/relay --header "Content-Type:application/json"
```


Features
--------

* Help page with usage information
* Allows both messages and actions to be sent via REST API
* Allows HTTPS for secure API key transmission
* Can use ##rqtest channel for testing with a sample key
* User/application authentication via API keys

ToDo
----

* Add URLs and a few more customizable options to the config file
* Modular parts for the API vs IRC client to allow for reloading of API code without disconnecting from IRC
* Per-channel API keys
* Require HTTPS
* Automated API regression testing
* API examples in many differetn languages
* Ability to support custom colors
* Set up easy management and revocation of API keys
* Allow users to register a command with RQ256 that hits a URL when triggered (in both IRC and API)
* Add output from door lock ("RedQueen256 opens the door for nick")
* Add output from CasCADE ("RedQueen256 dispenses fifty cents for nick at CasCADE")
