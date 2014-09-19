// Config options for irc relay bot

module.exports = {
    bot         : {
      nick            : "RedQueen" , // Bot nick 
      user            : "redqueen" , // Bot's user name (before the '@')
      name            : "RedQueen"   // Bot "real name"
    },
    connection  : {
      host        : "chat.freenode.net" ,
      port        : 6667 ,
      auth        : {
        user          : "RedQueen" ,
        password      : "password"
      }
    },
    channels     : ["#redqueen",'##rqtest']
}
   
