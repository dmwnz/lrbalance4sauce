// ==UserScript==
// @name     lrbalance4sauce
// @version  1
// @include  https://www.strava.com/activities/*
// ==/UserScript==

var q = document.createElement('script');
q.type="module"; 
//q.src="https://dmwnz.github.io/lrbalance4sauce/addbal.js";

const req = new XMLHttpRequest();
req.open('GET', "https://dmwnz.github.io/lrbalance4sauce/addbal.js", true);
req.onload = (event) => {
  q.text = req.response;
}
req.send();

document.body.appendChild(q); 

console.log('bye !');