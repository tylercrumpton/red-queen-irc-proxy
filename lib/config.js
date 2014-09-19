// Config options for irc relay bot

module.exports = {
    bot         : {
      nick            : "RedQueen256" , // Bot nick 
      user            : "redqueen" , // Bot's user name (before the '@')
      name            : "RedQueen"   // Bot "real name"
    },
    connection  : {
      host        : "chat.freenode.net" ,
      port        : 6667 ,
      auth        : {
        user          : "RedQueen256" ,
        password      : "altair"
      }
    },
    channels     : ["#btctiptest",'##rqtest', "#crumpspace", "#makerslocal"]
}
   
