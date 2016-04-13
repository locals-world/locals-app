/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
    console.log('Our app is ready to rock!');
  });

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    app.generate();
    app.consolelog('Components ready');
    // imports are loaded and elements have been registered
  });

  app.generate = function(){
    app.secretcode = (Math.floor(Math.random() * (999999 - 99999)) + 99999).toString();
    app.consolelog('Code generated '+ app.secretcode);  
  };

    app.requestsync = function() {

      // generate a temp pub/priv keypair
      var crypt = new JSEncrypt({default_key_size: 512});
      app.pubkey = crypt.getPublicKey();
      app.privkey = crypt.getPrivateKey();

      app.$.whisper.whisperpost(app.incomingsecret, JSON.stringify({
        'command': 'sync',
        'data': {
          'channel': app.secretcode,
          'publickey': app.pubkey
        }
      }));
    };

  // Scroll page to top and expand header
  app.scrollPageToTop = function() {
    document.getElementById('app').scrollTop = 0;
  };

  app.onDataRouteClick = function() {
    app.consolelog('New route '+ app.route);
    var drawerPanel = document.querySelector('#paperDrawerPanel');
    if (drawerPanel.narrow) {
      drawerPanel.closeDrawer();
    }
  };

  app.consolelog = function(log){
    var cons = document.querySelector('#console');
    var p = document.createElement("P");
    var t = document.createTextNode(Date.now()+ ': ' + log);
    p.appendChild(t);
    //cons.appendChild(p);
    cons.insertBefore(p, cons.childNodes[0]);
  };

  app.save = function(){
    app.$.localapi.writeData();
  };

  app.generatekey = function(){
    app.privatekey = uuid.v4();
  };

  app.msgreceived = function(e){
    console.log(e.detail.input.command);
    var command = e.detail.input.command;
    var data = e.detail.input.data;

    switch (command) {
      case 'sync':
        app.sync(data);
        break;
      case 'syncreceived':
        break;

    }

  };

  // functions activated by device-to-device communication
  // incoming sync request  
  app.sync = function(data){
    app.iomsg = { 'msg': 'Device with ID ' + data + ' wants to sync with this device' };
    app.route = 'iomsg';
  };

  // incoming update event

})(document);
