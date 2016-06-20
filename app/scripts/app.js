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
    //app.generate();
    // imports are loaded and elements have been registered
  });

  function importPage(url){
    return new Promise(function(resolve, reject){
      Polymer.Base.importHref(url, function(e){
        resolve(e.target.import);
      }, reject);
    });
  }

  app.generate = function(){
    console.log('New user!');
    importPage('/elements/locals-newuser/locals-newuser.html').then(function(){
      var element = document.createElement('locals-newuser');
      element.id = 'newuser';
      document.body.appendChild(element);
    }, function(err){
      console.log(err, 'error');
    });
  };

  app.homestate = function(){
    //debugger;
    console.log('Existing user');
    importPage('/elements/locals-user/locals-user.html').then(function(){
      var element = document.createElement('locals-user');
      element.id = 'user';
      document.body.appendChild(element);
    }, function(err){
      console.log(err, 'error');
    });
  };

})(document);
