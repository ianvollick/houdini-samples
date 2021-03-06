/*
Copyright 2016 Google, Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var flagIsSet = function(flagName) {
  return document.location.search.indexOf(flagName) !== -1;
};

var rafScheduled = false;
var tick = function(timestamp) {
  var offset = -0.1 * scroller.scrollTop;
  window.parallax.style.transform = 'translate(0, ' + offset + 'px)';
  requestAnimationFrame(tick);
  rafScheduled = false;
};

if (!flagIsSet('nojank')) {
  // Lets burn some time in the main thread;
  // up to 120ms per frame.
  requestAnimationFrame(function jankRAF(timestamp) {
    var delay = 120 * Math.random();
    while (window.performance.now() - timestamp < delay) {}
    requestAnimationFrame(jankRAF);
  });
}

window.scroller = document.querySelector('.scroll');
window.parallax = document.querySelector('.parallax');
window.document.querySelector('button').onclick = function() {
  window.scroller.scrollTop = window.scroller.scrollHeight;
};

if (flagIsSet('noworklet')) {
  console.log('Using main thread rAF');
  // Force scrolling text field and image on their own comp layer
  window.parallax.style.willChange = 'transform';
  window.scroller.style.willChange = 'transform';
  window.scroller.onscroll = function() {
    // Only schedule rAF once per frame
    if (!rafScheduled) {
      requestAnimationFrame(tick);
    }
    rafScheduled = true;
  };
} else {
  console.log('Using compositor worklet rAF');
  window.compositorWorklet.import('compworklet.js').then(function() {
    var worklet = new CompositorAnimator('parallax');
    var scrollerProxy = new CompositorProxy(self.scroller, ['scrollTop']);
    var parallaxProxy = new CompositorProxy(self.parallax, ['transform']);
    worklet.postMessage([scrollerProxy, parallaxProxy]);
  });
}
