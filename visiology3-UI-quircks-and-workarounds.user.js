// ==UserScript==
// @name         visiology3-UI-quircks-and-workarounds
// @namespace    http://tampermonkey.net/
// @version      2024-07-03
// @description  Try workaround some Visiology3 restrictions like https://visiology.tpondemand.com/helpdesk/request/66533-klikabelnye-dashbordy-na-datasete. E.g. in datasets usage context menu you will see only truncated datshboard names? without link which frequently even is not distinguishable. We fis it.
// @author       Pavel Alexeev
// @match        https://*/v3/visiology-designer/workspaces/*
// @icon         https://static.tildacdn.com/tild6231-3037-4733-b734-633533663566/favicon.ico
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM.addStyle
// @updateURL    https://github.com/Hubbitus/visiology3-UI-quirks-and-workarounds/raw/master/visiology3-UI-quircks-and-workarounds.user.js
// @downloadURL  https://github.com/Hubbitus/visiology3-UI-quirks-and-workarounds/raw/master/visiology3-UI-quircks-and-workarounds.user.js
// ==/UserScript==

/**
* @link https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists/61511955#61511955
**/
function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

/**
* General function to intercept all calls made with XMLHttpRequest.
* The main idea by https://github.com/GMEstonk/files/blob/main/xhr-redirect.js (<=https://www.reddit.com/r/learnjavascript/comments/14a3yvd/userscripts_is_there_a_way_to_intercept_all_http/)
* Note, for intercept fetch requests you may need to implement it additionally. See https://github.com/GMEstonk/files/blob/main/fetch-redirect.js
*
* @param handler - callable handler to pass events when it occured. Function must accept single parameter - event. Example of handler: function handleEvent(e) { console.log(`XHR handled event:`, e); }
* @param events. List of events to handle. See list in https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/load_event. All: events = ['loadstart', 'load', 'progress', 'error', 'abort']
**/
function handleResourceLoading(handler, events = ['loadend']){
    if(!XMLHttpRequest.nativeOpen){
        XMLHttpRequest.prototype.nativeOpen = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.customOpen = function(method, url, asynch, user, password) {
            //console.log('Intercepted XMLHttpRequest.open(). Setup handlers', method, url, asynch, user, password);
            events.forEach(event => this.addEventListener("loadend", handler));
            return this.nativeOpen(method, url, !!!asynch /* asynch */, user, password);
        }
        XMLHttpRequest.prototype.open = XMLHttpRequest.prototype.customOpen;
    }
    /* Also usefull example how to intercept set headers. May be used to obtain Authorization bearer for example.
    if(!XMLHttpRequest.nativeSetRequestHeader){
      XMLHttpRequest.prototype.nativeSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.customSetRequestHeader = function(header, value) {
        console.log('Intercepted XHR setRequestHeader():', header, value);
        return this.nativeSetRequestHeader(header, value);
      }
      XMLHttpRequest.prototype.setRequestHeader = XMLHttpRequest.prototype.customSetRequestHeader;
    }
    */
}

(function() {
    'use strict';

    GM.addStyle(`
        .long-and-truncated { overflow: visible !important; }
        .p-overlaypanel { width: auto !important; }
    `);
    console.log('Hi from [Visiology3 enhancments hack]');

    var dashboards;
    function cacheDashboardNames(event){
        // console.log(`XHR handled event:`, event);
        if (event.target.responseURL.endsWith('/dashboards')){
            let resp = JSON.parse(event.target.response);
            dashboards = resp.reduce((map, obj) => { map.set(obj.name, obj.guid); return map }, new Map());
            console.log('Dashboards loaded! Caching it', resp, dashboards);
        }
    }
    handleResourceLoading(cacheDashboardNames);

    waitForElement('.p-overlaypanel').then((elm) => {
        $(elm).find('li div.long-and-truncated div.long-and-truncated').each((i, it) => {
            let dashName = $(it).attr('title');
            let a = $(`<a href="${window.location}/dashboards/${dashboards.get(dashName)}" target="_blank" style="color: var(--colors_gray-600);">${dashName}</a>`);
            $(it).html(a);
        });
    });
})();
