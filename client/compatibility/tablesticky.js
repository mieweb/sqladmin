'use strict';

// the goal here is to offset as much processing to the load or window resize events.
// scroll event needs to be as lightweight as possible since it can fire hundreds of times a second
// the scroll event should not do any DOM seeks or calculate sizes of elements

var stickies = [];

function stickyWindowResize() {
	for (var x=0; x < stickies.length; x++) {
		var s = stickies[x],
			t = s.sOuter.offset().top;
		
		s.shInner[0].style.maxWidth = s.sfInner[0].style.maxWidth = s.sOuter.width() + 'px';
		s.hheight = s.sHeader.outerHeight();
		s.fheight = s.sFooter.outerHeight();
		s.top = Math.floor(t);
		s.bottom = Math.ceil(t + s.sOuter.outerHeight());
		s.sFooter[0].scrollTop = 10000000;
		s.windowh = $(window).height();
	}
}

function stickyWindowScroll(e) {
	var y = window.scrollY || document.documentElement.scrollTop, x = 0;
	
	for (x; x < stickies.length; x++) {
		var s = stickies[x],
			hstyle = s.sHeader[0].style,
			fstyle = s.sFooter[0].style;
			
		if (s.top - y > s.windowh || s.bottom - y < 0) {
			hstyle.position = fstyle.position = 'absolute';
			hstyle.top = fstyle.bottom = 0;
			hstyle.bottom = fstyle.top = 'auto';
			continue; // skip loop if top is below bottom window edge or bottom is above top window edge
		}
		
		if (s.bottom - s.hheight - s.fheight - y <= 0) {
			hstyle.position = 'absolute';
			hstyle.top = 'auto';
			hstyle.bottom = s.fheight + 'px';
		} else if (s.top - y <= 0) {
			hstyle.position = 'fixed';
			hstyle.top = 0;
			hstyle.bottom = 'auto';
		} else {
			hstyle.position = 'absolute';
			hstyle.top = 'auto';
			hstyle.bottom = 0;
		}
		
		if (s.top + s.hheight + s.fheight - y >= s.windowh) {
			fstyle.position = 'absolute';
			fstyle.bottom = 'auto';
			fstyle.top = s.hheight + 'px';
		} else if (s.bottom - y <= s.windowh) {
			fstyle.position = 'absolute';
			fstyle.bottom = 0;
			fstyle.top = 'auto';
		} else {
			fstyle.position = 'fixed';
			fstyle.bottom = 0;
			fstyle.top = 'auto';
		}
	}
}

$(document).ready(function() {
	var stickylist = $('.sticky');

	if (!stickylist.length) return; // we don't need to be attaching any events if the necessary elements do not exist on the page
	stickylist.each(function(index, stickyItem) {
		var s = $(stickyItem),
			outer = s.parent('.outer'),
			cloneh = s.clone().addClass('jsTHEAD').appendTo(outer),
			chInner = cloneh.children('.inner'),
			clonef = cloneh.clone().removeClass('jsTHEAD').addClass('jsTFOOT').appendTo(outer),
			cfInner = clonef.children('.inner');
		
		outer.addClass('jsApplied');
		s.addClass('jsTBODY');
		s.scroll(function() {
			chInner[0].scrollLeft = cfInner[0].scrollLeft = this.scrollLeft;
		});
		stickies.push({
			sOuter: outer,
			sHeader: cloneh,
			shInner: chInner,
			sFooter: clonef,
			sfInner: cfInner
		});
	});
	$(window).resize(stickyWindowResize).scroll(stickyWindowScroll).resize().scroll();
});