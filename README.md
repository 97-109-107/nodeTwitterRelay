nodeTwitterRelay
---------
A relay tool that publishes timestamps of tweets that passed a filter from the streaming api. 

What can it be modified into?
----------
 A relay station that provides streams to devices that are incapable of supporting https (eg. Arduino).

How does it work?
---------
The keywords and search types are specified in the *categories.json* file. Modify to suit your needs. The server rotates through the queries because you cannot have more than one stream open simultaneously.

How to make it run?
-----------
 - clone repo, make sure you have node and npm installed; 
 - do *npm install* in the repo directory (*this was build on the latest versions of npm, node, should be working with latest stables too*);
 - register for a developer account with twitter and copy the api keys;
 - paste the api keys into *config.template* and rename it into *config.js*;
 - run 'node server.js'
 - visit localhost:3000 to see the api paths;
