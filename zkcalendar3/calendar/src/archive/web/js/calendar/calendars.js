/* calendars.js

	Purpose:

	Description:

	History:
		Mon Mar 16 18:07:57     2009, Created by jumperchen

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

This program is distributed under GPL Version 2.0 in the hope that
it will be useful, but WITHOUT ANY WARRANTY.
*/
zk.load("calendar.lang.msgcal*");

var _zkdd = {};
zk.override(zDraggable.prototype, "initDrag",  _zkdd, function (event) {
	if(typeof zDraggable._dragging[this.element] != 'undefined' &&
		zDraggable._dragging[this.element]) return;

	if(Event.isLeftClick(event)) {
      // abort on form elements, fixes a Firefox issue
		var src = Event.element(event);
		if((tag_name = src.tagName.toUpperCase()) && (
			tag_name=='INPUT' ||
			tag_name=='SELECT' ||
			tag_name=='OPTION' ||
			tag_name=='BUTTON' ||
			tag_name=='TEXTAREA')) return;


		if (!this.element._skipped)
			//Tom M. Yeh, Potix: skip popup/dropdown (of combobox and others)
			for (var n = src; n && n != this.element; n = n.parentNode)
				if (Element.getStyle(n, 'position') == 'absolute')
					return;

		var pointer = [Event.pointerX(event), Event.pointerY(event)];
	//Tom M. Yeh, Potix: give the element a chance to ignore dragging
		if (this.options.ignoredrag && this.options.ignoredrag(this.element, pointer, event))
			return;
	//Tom M. Yeh, Potix: disable selection
	//zk.disableSelection(document.body); // Bug #1820433
	    var pos = zPos.cumulativeOffset(this.element);
	    this.offset = [0,1].map( function(i) { return (pointer[i] - pos[i]) });

		zDraggables.activate(this);
	//Jumper Chen, Potix: Bug #1845026
	//We need to ensure that the onBlur event is fired before the onSelect event for consistent among four browsers.
		if (zkau.currentFocus && Event.element(event) != zkau.currentFocus
			&& typeof zkau.currentFocus.blur == "function") zkau.currentFocus.blur();
			Event.stop(event);
			zkau.closeFloatsOnFocus(src); // Bug 2562880
		//Tom M. Yeh, Potix: mousedown is eaten above
		zkau.autoZIndex(src, false, true);
	}
});

// Fix bug for ZK 3.6.0
zk.revisedOffset = function (el, ofs) {
	if(!ofs) {
		if (el.getBoundingClientRect){ // IE and FF3
			var b = el.getBoundingClientRect();
			return [b.left + zk.innerX() - el.ownerDocument.documentElement.clientLeft,
				b.top + zk.innerY() - el.ownerDocument.documentElement.clientTop];
		}
		ofs = zPos.cumulativeOffset(el);
	}
	var scrolls = zPos.realOffset(el.parentNode);
	scrolls[0] -= zk.innerX(); scrolls[1] -= zk.innerY();
	return [ofs[0] - scrolls[0], ofs[1] - scrolls[1]];
};

zkCalendars = {
	DAYTIME: 24*60*60*1000, 
	ppTemplate: ['<div id="%1!pp" class="%2"><div class="%2-t1"></div><div class="%2-t2"><div class="%2-t3"></div></div>',
			  '<div class="%2-body"><div class="%2-inner">',
			  '<div class="%2-header"><div id="%1!ppc" class="%2-close"></div><div id="%1!pphd" class="%2-header-cnt"></div></div>',
			  '<div class="%2-cnt"><div class="%2-evts"><table id="%1!ppcnt" class="%2-evt-cnt" cellpadding="0" cellspacing="0"><tbody></tbody></table></div></div>',
			  '</div></div>',
			  '<div class="%2-b2"><div class="%2-b3"></div></div><div class="%2-b1"></div></div>'].join(''),

	evtTemplate: ['<div id="%1" class="%2 %3-more-faker" z.type="Calevent"><div class="%2-t1" %5></div><div class="%2-t2" %5><div class="%2-t3" %9></div></div>',
			  '<div class="%2-body" %5><div class="%2-inner" %8>',
			  '<div class="%2-cnt %3-arrow" %6><div class="%3-arrow-icon" %7></div><div class="%2-text">%4</div></div>',
			  '</div></div>',
			  '<div class="%2-b2" %5><div class="%2-b3" %9></div></div><div class="%2-b1" %5></div></div>'].join(''),
	ddTemplate: ['<div id="%1" class="%2" style="left:0px;width:100%;" z.type="Calevent"><div class="%2-t1"></div><div class="%2-t2"><div class="%2-t3"></div></div>',
			  '<div class="%2-body" id="%1!body"><div class="%2-inner"><dl id="%1!inner"><dt class="%2-header"></dt><dd class="%2-cnt"></dd></dl></div></div>',
			  '<div class="%2-b2"><div class="%2-b3"></div></div><div class="%2-b1"/></div>'].join(''),
	_scrollInfo: {},
	_drag: {},
	_ghost: {},
	_dateTime: [
		'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
		'04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
		'08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
		'12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
		'16:00', '16:30', '17:00', '17:30',	'18:00', '18:30', '19:00', '19:30',
		'20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
		'00:00'
	],
	init: function (cmp) {
		var ts = $int(getZKAttr(cmp, "ts")),
			cnt = $e(cmp, "cnt"),
			tzOffset = $int(getZKAttr(cmp, "tz")),
			row = zk.ie ? cnt.firstChild.rows[0].cells[0].firstChild.rows[1] :
					cnt.firstChild.rows[1],
			perHgh = row.firstChild.firstChild.offsetHeight;
		for (var c = row.cells, k = c.length; --k >= ts;)
			zkCalendars.fixPosition(perHgh, c[k].firstChild.childNodes, tzOffset);

		// Fix button
		var a = $e(cmp, "hdarrow"),
			hd = $e(cmp, "header");
		a.style.left = (a.parentNode.offsetWidth * ts - a.offsetWidth) - 5 + "px";
		zk.listen(a, "click", this.onArrowClick);
		
		// ignore day view
		if (hd.childNodes.length > ts + 2) {
			var zcls = getZKAttr(cmp, "zcls");
			zk.listen(hd, "mouseover", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					zk.addClass(target, zcls + "-day-over");
				}
			});
			zk.listen(hd, "mouseout", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					zk.rmClass(target, zcls + "-day-over");
				}
			});
			zk.listen(hd, "click", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					if (zkau.asap(cmp, 'onDayClick')) {
						zkau.send({
							uuid: cmp.id,
							cmd: "onDayClick",
							data: [getZKAttr($parentByTag(target, "TH"), "time")]
						}, 50);
					}
				}
			});
		}
		zk.listen(cnt, "scroll", function () {
			zkCalendars._scrollInfo[cmp.id] = cnt.scrollTop;
		});

		if (!getZKAttr(cmp, "readonly")) {
			// a trick for dragdrop.js
			cnt._skipped = true;
			zk.listen(cnt, 'click', function(evt) {
				if (!zk.dragging && !zkau.processing()) {
					zkCalendars.clearGhost(cmp);
					zkCalendars.onClick(cnt, evt);
				} else
					Event.stop(evt) ;
			});
			zkCalendars._drag[cnt.id] = new zDraggable(cnt, {
				starteffect: zkCalendars.closeFloats,
				endeffect: zkCalendars._enddrag,
				ghosting: zkCalendars._ghostdrag,
				draw: zkCalendars._drawdrag,
				ignoredrag: zkCalendars._ignoredrag
			});

			var daylong = $e(cmp, "daylong");
			zk.listen(daylong, 'click', function(evt) {
				if (!zk.dragging && !zkau.processing()) {
					zkCalendars.clearGhost(cmp);
					zkCalendars.onDaylongClick(daylong, evt);
				} else
					Event.stop(evt);
			});

			// a trick for dragdrop.js
			daylong._skipped = true;
			zkCalendars._drag[daylong.id] = new zDraggable(daylong, {
				starteffect: zkCalendars.closeFloats,
				endeffect: zkCalendars._endDaylongDrag,
				ghosting: zkCalendars._ghostDaylongDrag,
				change: zkCalendarsMonth._changedrag,
				draw: zkCalendarsMonth._drawdrag,
				ignoredrag: zkCalendars._ignoreDaylongDrag
			});
			zk.listen(cmp, 'click', zkCalendars.clearGhost);
		}
	},
	_getCalevent: function (evt, parent) {
		for (var n = Event.element(evt); n && n != parent; n = n.parentNode)
			// sometimes the ghost is not cleared yet.
			if ($type(n) == 'Calevent' && n.parentNode) return n;
		return null;
	},
	// content dragdrop
	_ignoredrag: function (cnt, p, evt) {
		if (zkau.processing() || !cnt._lefts || p[0] <= cnt._lefts[0] || p[0] > cnt._lefts[cnt._lefts.length-1])
			return true;

		// clear ghost
		zkCalendars.clearGhost($outer(cnt));
		for (var n = Event.element(evt); n && n != cnt; n = n.parentNode) {
			if ($type(n) == 'Calevent' && (!n.parentNode || getZKAttr(n, 'locked') == "true"))
				return true;
			else if (n.nodeType == 1 && zk.hasClass(n, "z-calevent-resizer")) {
				if (zkCalendars._drag[cnt.id])
					zkCalendars._drag[cnt.id]._zrz = true;
			}
		}
		return false;
	},
	_ghostdrag: function (dg, ghosting, evt) {
		if (ghosting) {
			var cnt = dg.element,
				ce = zkCalendars._getCalevent(evt, cnt),
				cmp = $outer(cnt),
				ts = $int(getZKAttr(cmp, "ts")),
				row = zk.ie ? cnt.firstChild.rows[0].cells[0].firstChild.rows[1]
					: cnt.firstChild.rows[1],
				cells = row.cells,
				ph = row.firstChild.firstChild.offsetHeight/2;

			dg._zcells = cells;
			dg._zoffs = zk.revisedOffset(cnt);
			dg._zoffs = {
				t: dg._zoffs[1],
				h: cnt.offsetHeight,
				s: cells.length - ts, // the size of the event column
				b: ts, // begin index
				ph: ph, // per height
				th: cells[ts].firstChild.offsetHeight // total height
			}

			if (!ce) {
				var x = Event.pointerX(evt),
					y = Event.pointerY(evt),
					y1 = dg._zoffs.t,
					cIndex = dg._zoffs.s,
					begin = dg._zoffs.b;

				for (; cIndex--;)
					if (cnt._lefts[cIndex] <= x)
						break;

				if (cIndex < 0)
					cIndex = 0;

				cells[begin + cIndex].firstChild.insertAdjacentHTML("afterBegin",
					zkCalendars.ddTemplate.replace(new RegExp("%([1-2])", "g"), function (match, index) {
						return index < 2 ? cmp.id + '!dd' : 'z-calevent';
					}));

				dg._zoffs.x = x;
				dg._zoffs.y = y;

				dg.element = $e(cmp.id + '!dd');

				dg._zecnt = dg.element.childNodes[2].firstChild.firstChild;
				zk.addClass(dg.element, getZKAttr(cmp, "zcls") + "-evt-ghost");

				var r = y + dg.handle.scrollTop - y1;
				r = Math.floor(r / ph);
				dg.element.style.top = r * ph + "px";

				var offsHgh = 0,
					body = $e(cmp.id + '!dd', "body"),
					height = 0,
					inner = body.firstChild.firstChild;

				inner.firstChild.innerHTML = zkCalendars._dateTime[r] + ' - ' + zkCalendars._dateTime[r + 2];

				zk.childNodes(dg.element, zkCalendars.isLegalChild).forEach(function (n) {
					height+= n.offsetHeight;
				});

				height += zk.getPadBorderHeight(body);
				height += zk.getPadBorderHeight(body.firstChild);
				height += zk.getPadBorderHeight(inner);
				height += 2;
				dg._zrzoffs = height;

				// begin index
				dg._zoffs.bi = r;
				// end index
				dg._zoffs.ei = r + 2;

				inner.style.height = (ph * 2) - height + "px";
				dg._zhd = inner.firstChild;
			} else {
				var faker = ce.cloneNode(true);
				faker.id = cmp.id + '!dd';

				//reset
				ce.parentNode.appendChild(faker);
				ce.style.visibility = "hidden";
				dg.element = $e(cmp.id + '!dd');

				dg._zevt = ce;
				dg._zhd = dg.element.childNodes[2].firstChild.firstChild.firstChild;

				if (dg._zrz) {
					dg._zrzoffs = dg.element.offsetHeight + 2 - dg._zhd.parentNode.offsetHeight;
					dg._zecnt = dg.element.childNodes[2].firstChild.firstChild;
				} else
					dg._zdelta = ce.offsetTop - (Event.pointerY(evt) + dg.handle.scrollTop - dg._zoffs.t);

				// begin index
				dg._zoffs.bi = Math.floor(ce.offsetTop / ph);
				// end index
				dg._zoffs.ei = Math.ceil(ce.offsetHeight / ph);
			}
			zkau.beginGhostToDIV(dg);
		} else {

			var cnt = dg.handle,
				row = zk.ie ? cnt.firstChild.rows[0].cells[0].firstChild.rows[1]
					: cnt.firstChild.rows[1],
				hgh = dg._zoffs.ph;

			if (dg._zevt) {
				dg._zdata = {
					rows: (dg._zevt.offsetTop - dg.element.offsetTop) / hgh,
					cols: dg._zevt.parentNode.parentNode.cellIndex -
							dg.element.parentNode.parentNode.cellIndex
				};
				if (dg._zrz) {
					dg._zdata.dur = (dg.element.offsetHeight - dg._zevt.offsetHeight) / hgh;
					if (dg._zdata.dur < 0)
						dg._zdata.dur = Math.floor(dg._zdata.dur);
					else dg._zdata.dur = Math.ceil(dg._zdata.dur);
				}
			} else {
				dg._zdata = {
					rows: dg.element.offsetTop / hgh,
					cols: dg.element.parentNode.parentNode.cellIndex - $int(getZKAttr($outer(cnt), "ts")),
					dur: Math.ceil(dg.element.offsetHeight/ hgh)
				};
			}

			zkau.endGhostToDIV(dg);

			// target is Calendar's event
			dg.element = dg.handle;
		}
	},
	_resetPosition: function (faker, cmp) {
		faker.style.width = "100%";
		faker.style.left = "0px";
		zk.addClass(faker, getZKAttr(cmp, "zcls") + "-evt-ghost");
	},
	_drawdrag: function (dg, p, evt) {
		var h = dg.element.offsetHeight,
			x = Event.pointerX(evt),
			y = Event.pointerY(evt),
			y1 = dg._zoffs.t,
			h1 = dg._zoffs.h,
			cIndex = dg._zoffs.s,
			lefts = dg.handle._lefts,
			cells = dg._zcells,
			begin = dg._zoffs.b
			ph = dg._zoffs.ph,
			th = dg._zoffs.th,
			delta = dg._zevt && !dg._zrz ? ph : 0;

		// avoid the wrong mousemove event in IE6.
		if (zk.ie6Only && dg._zoffs.x && x == dg._zoffs.x && dg._zoffs.y == y) {
			dg._zoffs.x = null;
			return;
		}

		// fix scroll bar
		var move = 0, steps;
		if (y - ph < y1) {
			clearInterval(zkCalendars.run);
			move = dg.handle.scrollTop;
			steps = ph;
		} else if (y + ph > y1 + h1) {
			clearInterval(zkCalendars.run);
			move = dg.handle.scrollHeight - dg.handle.scrollTop - dg.handle.offsetHeight;
			steps = -ph;
		} else clearInterval(zkCalendars.run);

		if (move > 0)
			zkCalendars.run = setInterval(function() {
				if (move <= 0) {
					clearInterval(zkCalendars.run);
					return;
				}
				dg.handle.scrollTop -= steps;
				move -= (steps < 0 ? -steps : steps);
			}, 100);

		if (dg._zevt) {
			if (!dg._zrz) {
				for (; cIndex--;)
					if (lefts[cIndex] <= x)
						break;

				if (cIndex < 0)
					cIndex = 0;

				if (cells[begin + cIndex].firstChild != dg.element.parentNode) {
					cells[begin + cIndex].firstChild.appendChild(dg.element);
					if (!dg._zchanged) zkCalendars._resetPosition(dg.element, $outer(dg.handle));
					dg._zchanged = true;
				}

				if (y + dg._zdelta + dg.handle.scrollTop - y1 < 0) {
					y = 0 - dg.handle.scrollTop - dg._zdelta + y1;
				}
				if (y + dg._zdelta + h + dg.handle.scrollTop - y1 >= th) {
					y = (th - h - dg.handle.scrollTop) + y1 - dg._zdelta;
				}

				var r = y + dg._zdelta + 5 + dg.handle.scrollTop - y1;
				r = Math.floor(r / (ph));
				if (dg.element.offsetTop != r * ph) {
					dg.element.style.top = r * ph + "px";
					if (!dg._zchanged) zkCalendars._resetPosition(dg.element, $outer(dg.handle));
					dg._zchanged = true;
				}

				// Update header
				dg._zhd.innerHTML = zkCalendars._dateTime[r] + ' - ' + zkCalendars._dateTime[r + dg._zoffs.ei];
			} else {
				if (y + ph > y1 + h1)
					y = y1 + h1 - ph;

				var r = y + dg.handle.scrollTop - y1;

				r = Math.ceil(r / (ph));

				var height = (r * ph - dg.element.offsetTop) - dg._zrzoffs;

				if (height < 0) {
					height = ph - dg._zrzoffs;
					r = dg._zoffs.bi + 1;
				}
				if (dg._zecnt.offsetHeight != height) {
					dg._zecnt.style.height = height + "px";
					if (!dg._zchanged) zkCalendars._resetPosition(dg.element, $outer(dg.handle));
					dg._zchanged = true;
				}

				// Update header
				dg._zhd.innerHTML = zkCalendars._dateTime[dg._zoffs.bi] + ' - ' + zkCalendars._dateTime[r];
			}
		} else {
			if (y < y1)
				y = y1;
			else if (y + ph > y1 + h1)
				y = y1 + h1 - ph;

			var r = Math.ceil((y + dg.handle.scrollTop - y1) / ph),
				b = dg._zoffs.bi,
				e = dg._zoffs.ei;

			if (r < b)
				b = r;
			else if (r > b)
				e = r;

		 	if (dg.element.offsetTop != b * ph)
				dg.element.style.top = b * ph + "px";

			var hgh = ((e - b) * ph) - dg._zrzoffs;
			if (dg._zecnt.offsetHeight != hgh)
				dg._zecnt.style.height = hgh + "px";

			// Update header
			dg._zhd.innerHTML = zkCalendars._dateTime[b] + ' - ' + zkCalendars._dateTime[e];
		}
	},
	_getTimeOffset: function (d, dur, dur2) {
		var d1 = new Date(d.getTime()),
			index = dur2 != null ? dur2 : zkCalendars.getTimeIndex(d) + dur;

		d1.setHours(Math.floor(index/2));
		d1.setMinutes(index%2 ? 30 : 0);
		d1.setMilliseconds(0);
		d.setMilliseconds(0);

		return dur2 != null ? d1.getTime() - d.getTime() : d.getTime() - d1.getTime();
	},
	_enddrag: function (cnt, evt) {
		var dg = zkCalendars._drag[cnt.id];
		if (dg && dg._zdata) {
			clearInterval(zkCalendars.run);
			var cmp = $outer(cnt);
			if (dg._zrz) {
				if (dg._zdata.dur) {
					var ce = dg._zevt,
						bd = new Date($int(getZKAttr(ce, "bd"))),
						ed = new Date($int(getZKAttr(ce, "ed"))),
						ofs = zkCalendars._getTimeOffset(zkCalendars.fixTimeZoneFromServer(
								ed, $int(getZKAttr(cmp, "tz"))), dg._zdata.dur);

					zkau.send({
						uuid: cmp.id,
						cmd: "onEventUpdate",
						data: [
							ce.id,
							bd.getTime(),
							ed.getTime() - ofs,
							Event.pointerX(evt),
							Event.pointerY(evt),
							zk.innerWidth(),
							zk.innerHeight()]
					}, 100);

					zkCalendars._ghost[cmp.id] = function () {
						ce = $e(ce);
						if (ce)
							ce.style.visibility = "";
						zk.remove($e(cmp.id, 'dd'));
						delete zkCalendars._ghost[cmp.id];
					};
				} else {
					dg._zevt.style.visibility = "";
					zk.remove($e(cmp.id, 'dd'));
				}
			} else if (dg._zevt) {
				var cols = dg._zdata.cols,
					rows = dg._zdata.rows;
				if (cols || rows) {
					var days = cols * zkCalendars.DAYTIME,
						ce = dg._zevt,
						bd = new Date($int(getZKAttr(ce, "bd"))),
						ed = new Date($int(getZKAttr(ce, "ed"))),
						ofs = zkCalendars._getTimeOffset(zkCalendars.fixTimeZoneFromServer(
								bd, $int(getZKAttr(cmp, "tz"))), -rows) + days;
					zkau.send({
						uuid: cmp.id,
						cmd: "onEventUpdate",
						data: [
							ce.id,
							bd.getTime() - ofs,
							ed.getTime() - ofs,
							Event.pointerX(evt),
							Event.pointerY(evt),
							zk.innerWidth(),
							zk.innerHeight()]
					}, 100);


					zkCalendars._ghost[cmp.id] = function () {
						ce = $e(ce);
						if (ce)
							ce.style.visibility = "";
						zk.remove($e(cmp.id, 'dd'));
						delete zkCalendars._ghost[cmp.id];
					};
				} else {
					dg._zevt.style.visibility = "";
					zk.remove($e(cmp.id, 'dd'));
				}
			} else {
				var cols = dg._zdata.cols,
					rows = dg._zdata.rows,
					dur = dg._zdata.dur + rows,
					days = cols * zkCalendars.DAYTIME,
					cmp = $outer(cnt),
					tzOffset = $int(getZKAttr(cmp, "tz")),
					bd = new Date($int(getZKAttr(cmp, "bd")) + days),
					bd1 = zkCalendars.fixTimeZoneFromServer(bd, tzOffset),
					ofs = zkCalendars._getTimeOffset(bd1, false, rows),
					ofs1 = zkCalendars._getTimeOffset(bd1, false, dur);

				zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime() + ofs,
					bd.getTime() + ofs1, Event.pointerX(evt), Event.pointerY(evt),
					zk.innerWidth(), zk.innerHeight()]}, 100);


				zkCalendars._ghost[cmp.id] = function () {
					zk.remove($e(cmp.id, 'dd'));
					delete zkCalendars._ghost[cmp.id];
				};
			}
			// fix opera jumping
			if (zk.opera) cnt.scrollTop = zkCalendars._scrollInfo[cmp.id];
			dg._zchanged = dg._zecnt = dg._zrzoffs = dg._zrs = dg._zdata = dg._zcells = dg._zoffs = dg._zevt = null;
		}
	},
	// daylong dragdrop
	_ignoreDaylongDrag: function (daylong, p, evt) {
		if (zkau.processing()) return true;
		var cmp = $outer(daylong),
			zcls = getZKAttr(cmp, "zcls"),
			cls = zcls + "-daylong-faker-more",
			ncls = zcls + "-daylong-faker-nomore";

		// clear ghost
		zkCalendars.clearGhost(cmp);

		for (var n = Event.element(evt); n && n != daylong; n = n.parentNode)
			if ((n.nodeType == 1 && zk.hasClass(n, cls) && !zk.hasClass(n, ncls))
				|| ($type(n) == 'Calevent' && (!n.parentNode || getZKAttr(n, 'locked') == "true")))
				return true;

		return false;
	},
	_ghostDaylongDrag: function (dg, ghosting, evt) {
		if (ghosting) {
			var daylong = dg.element,
				ce = zkCalendars._getCalevent(evt, daylong),
				cmp = $outer(dg.handle),
				zcls = getZKAttr(cmp, 'zcls'),
				html = '<div id="'+ cmp.id + '!rope" class="' + zcls + '-daylong-dd">'
					 + '<div class="' + zcls + '-dd-rope"></div></div>';


			document.body.insertAdjacentHTML("afterBegin", html);

			var row = daylong.firstChild.firstChild.lastChild,
				width = row.firstChild.offsetWidth,
				p = Event.pointer(evt);

			dg._zinfo = [];
			for (var left = 0, n = row.firstChild; n;
					left += n.offsetWidth, n = n.nextSibling)
				dg._zinfo.push({l: left, w: n.offsetWidth});

			dg._zoffs = zk.revisedOffset(dg.handle);
			dg._zoffs = {
				l: dg._zoffs[0],
				t: dg._zoffs[1],
				w: dg.handle.offsetWidth,
				h: dg.handle.offsetHeight,
				s: dg._zinfo.length
			};

			if (ce) {
				var faker = ce.cloneNode(true);
				faker.id = cmp.id + '!dd';
				zk.addClass(faker, zcls + '-evt-faker-dd');
				var h = ce.offsetHeight;
				faker.style.width = width + "px";
				faker.style.height = h + "px";
				faker.style.left = p[0] - (width/2) + "px";
				faker.style.top = p[1] + h + "px";
				zk.addClass(ce, zcls + '-evt-dd');
				document.body.insertBefore(faker, document.body.firstChild);
				dg.element = $e(cmp.id + '!dd');

				var tzOffset = $int(getZKAttr(cmp, "tz")),
					bd = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "bd"))), tzOffset),
					ed = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "ed"))), tzOffset);

				if (ed.getHours() == 0 && ed.getMinutes() == 0 &&
						ed.getSeconds() == 0) {
					ed = new Date(ed.getTime() - 1000);
				}
				bd.setHours(0);
				bd.setMinutes(0);
				bd.setSeconds(0);
				bd.setMilliseconds(0);
				ed.setHours(23);
				ed.setMinutes(59);
				ed.setSeconds(59);
				ed.setMilliseconds(0);

				dg._zdur = Math.ceil((ed.getTime() - bd.getTime())/ zkCalendars.DAYTIME);
				dg._zevt = ce;
			}

			zkau.beginGhostToDIV(dg);

			dg._zdim = {w: width, h: daylong.offsetHeight, hs:[daylong.offsetHeight]};
			dg._zrope = $e(cmp.id, "rope");

			var cols = Math.floor((p[0] - dg._zoffs.l)/dg._zdim.w);

			dg._zpos = [cols, 0];

			// fix rope
			zkCalendarsMonth._fixRope(dg._zinfo, dg._zrope.firstChild, cols, 0, dg._zoffs, dg._zdim, dg._zdur);
		} else {
			zkau.endGhostToDIV(dg);

			// target is Calendar's event
			dg.element = dg.handle;
		}
	},
	_endDaylongDrag: function (daylong, evt) {
		var dg = zkCalendars._drag[daylong.id];
		if (dg) {

			var cmp = $outer(daylong), ce;
			if (dg._zevt) {
					var zcls = getZKAttr(cmp, 'zcls'),
					tzOffset = $int(getZKAttr(cmp, "tz")),
					bd = zkCalendars.fixTimeZoneFromServer(
							new Date($int(getZKAttr(cmp, "bd")) + (dg._zpos1[0] * (zkCalendars.DAYTIME))), tzOffset),
					bd1 = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(dg._zevt, "bd"))), tzOffset);

				zk.rmClass(dg._zevt, zcls + '-evt-dd');

				bd.setHours(bd1.getHours());
				bd.setMinutes(bd1.getMinutes());
				bd.setSeconds(bd1.getSeconds());
				bd1.setMilliseconds(0);
				bd.setMilliseconds(0);
				var offs = bd.getTime() - bd1.getTime();

				if (offs) {
					ce = dg._zevt;
					ce.style.visibility = "hidden";
					var ed = new Date($int(getZKAttr(dg._zevt, "ed")));
					ed.setMilliseconds(0);
					zkau.send({
						uuid: cmp.id,
						cmd: "onEventUpdate",
						data: [dg._zevt.id,
							$int(getZKAttr(dg._zevt, "bd")) + offs,
							ed.getTime() + offs,
							Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(), zk.innerHeight()]
					}, 100);
				} else
					zk.remove($e(cmp.id, "rope"));
				zk.remove($e(cmp.id, 'dd'));
			} else {
				var c = dg._zpos[0],
					c1 = dg._zpos1[0],
					b = (c < c1 ? c : c1) * zkCalendars.DAYTIME,
					bd = new Date($int(getZKAttr(cmp, "bd")) + b);
					ed = new Date(bd.getTime() + dg._zpos1[2] * zkCalendars.DAYTIME);

				// clean
				bd.setMilliseconds(0);
				ed.setMilliseconds(0);

				zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime(),
					ed.getTime(), Event.pointerX(evt), Event.pointerY(evt),
					zk.innerWidth(), zk.innerHeight()]}, 100);
			}

			zkCalendars._ghost[cmp.id] = function () {
				ce = $e(ce);
				if (ce) ce.style.visibility = "";
				zk.remove($e(cmp.id, "rope"));
				delete zkCalendars._ghost[cmp.id];
			};
			dg._zpos1 = dg._zpos = dg._zrope = dg._zdim = dg._zdur = dg._zevt = null;
		}
	},
	onClick: function (cnt, evt) {
		var cmp = $outer(cnt),
			p = Event.pointer(evt);

		if (!cnt._lefts || p[0] <= cnt._lefts[0]) return;

		var ce = zkCalendars._getCalevent(evt, cnt);
		if (ce) {
			zkau.send({uuid: cmp.id, cmd: "onEventEdit", data: [ce.id,
				p[0], p[1], zk.innerWidth(),
				zk.innerHeight()]}, 100);
		} else {
			var ts = $int(getZKAttr(cmp, "ts")),
				row = zk.ie ? cnt.firstChild.rows[0].cells[0].firstChild.rows[1] :
						cnt.firstChild.rows[1],
				cells = row.cells,
				width = row.cells[0].offsetWidth,
				offs = zk.revisedOffset(cnt),
				ph = row.firstChild.firstChild.offsetHeight/2;
				x = p[0],
				y = p[1],
				cIndex = cells.length - ts,
				rows = Math.floor((y + cnt.scrollTop - offs[1]) /
						(row.firstChild.firstChild.offsetHeight/2));

			for (; cIndex--;)
				if (cnt._lefts[cIndex] <= x)
					break;

			if (cIndex < 0)
				cIndex = 0;

			cells[ts + cIndex].firstChild.insertAdjacentHTML("afterBegin",
			zkCalendars.ddTemplate.replace(new RegExp("%([1-2])", "g"), function (match, index) {
				return index < 2 ? cmp.id + '!dd' : 'z-calevent';
			}));

			var faker = $e(cmp.id + '!dd');
			zk.addClass(faker, getZKAttr(cmp, "zcls") + "-evt-ghost");

			faker.style.top = rows * ph + "px";

			var offsHgh = 0,
				body = $e(cmp.id + '!dd', "body"),
				height = 0,
				inner = body.firstChild.firstChild;

			inner.firstChild.innerHTML = zkCalendars._dateTime[rows] + ' - ' + zkCalendars._dateTime[rows + 2];

			zk.childNodes(faker, zkCalendars.isLegalChild).forEach(function (n) {
				height+= n.offsetHeight;
			});

			height += zk.getPadBorderHeight(body);
			height += zk.getPadBorderHeight(body.firstChild);
			height += zk.getPadBorderHeight(inner);
			height += 2;
			inner.style.height = (ph*2) - height + "px";


			var days = cIndex * zkCalendars.DAYTIME,
				bd = new Date($int(getZKAttr(cmp, "bd")) + days),
				tzOffset = $int(getZKAttr(cmp, "tz")),
				bd1 = zkCalendars.fixTimeZoneFromServer(bd, tzOffset),
				ofs = zkCalendars._getTimeOffset(bd1, false, rows),
				ofs1 = zkCalendars._getTimeOffset(bd1, false, rows+2);
			// clean
			bd.setMilliseconds(0);
			zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime() + ofs,
				bd.getTime() + ofs1,
				p[0], p[1],
				zk.innerWidth(), zk.innerHeight()]}, 100);

			zkCalendars._ghost[cmp.id] = function () {
				zk.remove($e(cmp.id, 'dd'));
				delete zkCalendars._ghost[cmp.id];
			};
		}
		zkCalendars.closeFloats();
		Event.stop(evt);
	},
	onDaylongClick: function (daylong, evt) {
		var ce = zkCalendars._getCalevent(evt, daylong);
		if (ce) {
			zkau.send({uuid: $uuid(daylong), cmd: "onEventEdit", data: [ce.id,
				Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(),
				zk.innerHeight()]}, 100);
		} else {
			var cmp = $outer(daylong),
				zcls = getZKAttr(cmp, 'zcls'),
				html = '<div id="'+ cmp.id + '!rope" class="' + zcls + '-daylong-dd">'
					 + '<div class="' + zcls + '-dd-rope"></div></div>';


			document.body.insertAdjacentHTML("afterBegin", html);

			var row = daylong.firstChild.firstChild.lastChild,
				width = row.firstChild.offsetWidth,
				offs = zk.revisedOffset(daylong),
				p = Event.pointer(evt),
				cols = Math.floor((p[0] - offs[0])/width),
				b = cols * zkCalendars.DAYTIME,
				bd = new Date($int(getZKAttr(cmp, "bd")) + b);

			var zinfo = [];
			for (var left = 0, n = row.firstChild; n;
					left += n.offsetWidth, n = n.nextSibling)
				zinfo.push({l: left, w: n.offsetWidth});

			var zoffs = {
				l: offs[0],
				t: offs[1],
				w: daylong.offsetWidth,
				h: daylong.offsetHeight,
				s: zinfo.length
			};

			zkCalendarsMonth._fixRope(zinfo, $e(cmp.id, "rope").firstChild, cols,
				0, zoffs, {w: width, h: daylong.offsetHeight, hs:[daylong.offsetHeight]}, 1);

			// clean
			bd.setMilliseconds(0);
			zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime(),
				bd.getTime() + zkCalendars.DAYTIME,
				p[0], p[1],
				zk.innerWidth(), zk.innerHeight()]}, 100);

			zkCalendars._ghost[cmp.id] = function () {
				zk.remove($e(cmp.id, "rope"));
				delete zkCalendars._ghost[cmp.id];
			};
		}
		zkCalendars.closeFloats();
		Event.stop(evt);
	},
	clearGhost: function (cmp) {
		cmp = $parentByType(zkau.evtel(cmp), "Calendars");
		if (cmp) {
			if (zkCalendars._ghost[cmp.id])
				zkCalendars._ghost[cmp.id]();
		} else {
			for (var f in zkCalendars._ghost)
				zkCalendars._ghost[f]();
		}
	},
	cleanup: function (cmp) {
		zkCalendars.clearGhost(cmp);
		// just in case
		zkCalendars.closeFloats();
	},
	closeFloats: function () {
		if (zkCalendars._pp) {
			zk.unlisten(document.body, "click", zkCalendars.unMoreClick);
			zk.remove(zkCalendars._pp);
			zkCalendars._pp = null;
		}
	},
	onArrowClick: function (evt) {
		var a = Event.element(evt),
			cmp = $outer(a),
			zcls = getZKAttr(cmp, "zcls"),
			cls = zcls + "-week-header-arrow-close";
			isClose = zk.hasClass(a, cls),
			daylong = $e(cmp, "daylong"),
			rows = daylong.firstChild.rows,
			len = rows.length;
		zkCalendars.clearGhost(cmp);
		zk[isClose ? "rmClass": "addClass"] (a, cls);

		if (rows.length < 2) return; // nothing to do

		if (!isClose) {
			var data = [],
				datas = rows[len-1].cells.length;
			for (var i = 0, c = datas; c--; i++)
				data[i] = [];

			for (var i = 0, j = len - 1; i < j; i++) {
				for (var k = 0, z = 0, cells = rows[i].cells,
						cl = cells.length; k < cl && z + k < datas; k++) {
					if (cells[k].firstChild.id)
						data[k+z].push(cells[k].firstChild);
					var cols = cells[k].colSpan;
					while(--cols > 0)
						data[k+ ++z].push(cells[k].firstChild);
				}
				rows[i].style.display = "none";
			}

			var faker = daylong.firstChild.insertRow(len - 1);
			for (var i = datas; i--;) {
				cell = faker.insertCell(0);
				cell.className = rows[len].cells[i].className;
				zk.addClass(cell, zcls + "-daylong-faker-more");
				if (data[i].length > 0) {
					var evts = data[i];
					cell.innerHTML = "+" + evts.length + "&nbsp;" + msgcal.MORE;
					zk.listen(cell, "click", zkCalendars.onMoreClick);
				} else {
					cell.innerHTML = zk.ie ? "&nbsp;" : "";
					zk.addClass(cell, zcls + "-daylong-faker-nomore");
				}
			}
			cmp._evtsData = data;
		} else {
			for (var i = 0, j = len - 1; i < j; i++)
				rows[i].style.display = "";
			zk.remove(rows[len - 2]);
		}

		// recalculate
		zkCalendars.beforeSize(cmp);
		zkCalendars.onSize(cmp);
		Event.stop(evt);
	},
	onMoreClick: function (evt) {
		var cell = Event.element(evt),
			daylong = cell.parentNode.parentNode.parentNode.parentNode,
			uuid = $uuid(daylong),
			ci = cell.cellIndex,
			pp,
			table = $e(uuid, "ppcnt");

		zkCalendars.clearGhost($e(uuid));

		if (!zkCalendars._pp) {
			pp = document.createElement("DIV");
			document.body.appendChild(pp);
			zk.setOuterHTML(pp, zkCalendars.ppTemplate.replace(new RegExp("%([1-2])", "g"), function (match, index) {
					return index < 2 ? uuid : 'z-calpp';
				}));
			zkCalendars._pp = pp = $e(uuid, "pp");
			zk.listen(document.body, "click", zkCalendars.unMoreClick);
			table = $e(uuid, "ppcnt");
			if(!getZKAttr($e(uuid), "readonly"))
				zk.listen(pp, "click", zkCalendars.onPopupClick);
		} else {
			if (getZKAttr(zkCalendars._pp, "ci") == ci) {
				// ignore onEventCreate
				Event.stop(evt);
				return;
			}

			for (var i = table.rows.length; i--;)
				zk.remove(table.rows[0]);
			pp = zkCalendars._pp;
		}

		setZKAttr(pp, "ci", ci);

		var offs= zk.revisedOffset(cell),
			wd = daylong.offsetWidth,
			csz = cell.parentNode.cells.length,
			single = wd/csz;

		wd = csz > 2 ? single*3*0.9 : wd * 0.8;

		if (csz > 2 && ci > 0)
			if (csz > ci+1)
				pp.style.left = offs[0] - (wd - single)/2 + "px";
			else
				pp.style.left = offs[0] - (wd - single) + "px";
		else if (csz > 2)
			pp.style.left = offs[0] + "px";
		else pp.style.left = offs[0] + (single * 0.1) + "px";

		pp.style.top = offs[1] + zk.offsetHeight(cell) + 1 + "px";
		pp.style.width = wd + "px";

		//filling data
		var cmp = $e(uuid),
			evts = cmp._evtsData[ci],
			oneDay = 60*60*24*1000,
			tzOffset = $int(getZKAttr(cmp, "tz")),
			bd = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(cmp, "bd"))), tzOffset),
			ed = new Date(bd.getTime() + oneDay);

		for (var i = evts.length; i--;) {
			var tr = table.insertRow(0),
				ce = evts[i],
				cr = tr.insertCell(0),
				cm = tr.insertCell(0),
				cl = tr.insertCell(0),
				hc = getZKAttr(ce, 'hc'),
				cc = getZKAttr(ce, 'cc'),
				zcls = getZKAttr(ce, "zcls");

			ce._bd = ce._bd || zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "bd"))), tzOffset);
			ce._ed = ce._ed || zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "ed"))), tzOffset);
			cl.className = "z-calpp-evt-l";
			if (bd.getTime() + (oneDay * ci) - ce._bd.getTime() >= 1000) {
				var info = [
						ce.id + "!fl",
						zcls,
						zcls + "-left",
						ce._bd.getMonth() + 1 + "/" + ce._bd.getDate(),
						hc ? ' style="background:' + hc + '"' : '',
						cc ? ' style="background:' + cc + '"' : '',
						cc ? ' style="border-bottom-color:' + cc + ';border-top-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + '"' : '',
					];
				cl.innerHTML = zkCalendars.evtTemplate.replace(new RegExp("%([1-8])", "g"), function (match, index) {
					return info[index - 1];
				});
			} else
				cl.innerHTML = "";

			cm.className = "z-calpp-evt-m";

			var faker = ce.cloneNode(true);
			zk.addClass(faker, "z-calpp-evt-faker");
			cm.appendChild(faker);

			cr.className = "z-calpp-evt-r";
			if (ce._ed.getTime() - (ed.getTime() + (oneDay * ci)) >= 1000) {
				var d = new Date(ce._ed.getTime() - 1000),
					info = [
						ce.id + "!fr",
						zcls,
						zcls + "-right",
						d.getMonth() + 1 + "/" + d.getDate(),
						hc ? ' style="background:' + hc + '"' : '',
						cc ? ' style="background:' + cc + '"' : '',
						cc ? ' style="border-bottom-color:' + cc + ';border-top-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + '"' : ''
					];
				cr.innerHTML = zkCalendars.evtTemplate.replace(new RegExp("%([1-8])", "g"), function (match, index) {
					return info[index - 1];
				});
			} else
				cr.innerHTML = "";
		}
		zk.cleanVisibility(pp);
		Event.stop(evt);
	},
	onPopupClick: function (evt) {
		var pp = zkCalendars._pp,
			ce = zkCalendars._getCalevent(evt, pp);
		if (ce) {
			zkau.send({uuid: $uuid(pp), cmd: "onEventEdit", data: [$uuid(ce),
				Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(),
				zk.innerHeight()]}, 100);
			Event.stop(evt);
		}
	},
	isAncestor: function (p, c) {
		for (; c; c = $parent(c))
			if (p == c)
				return true;
		return false;
	},
	unMoreClick: function (evt) {
		if (!zkCalendars.isAncestor(zkCalendars._pp, Event.element(evt)))
			zkCalendars.closeFloats();
	},
	fixTimeZoneFromServer: function (date, tzOffset) {
		return new Date(date.getTime() + (date.getTimezoneOffset() + tzOffset) * 60000);
	},
	fixPosition: function(perHgh, cn, tzOffset) {
		if (!cn.length) return;
		var data = [];
		for (var i = 0; i < 48; i++)
			data[i] = [];

		for (var ce = cn[0]; ce; ce = ce.nextSibling) {
			var bd = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "bd"))), tzOffset),
				ed = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "ed"))), tzOffset);
			 ce._bd = bd;
			 ce._ed = ed;

			// cross day
			if (ed.getDate() != bd.getDate())
				ed = new Date(ed.getTime() - 1000);

			// fix hgh
			var top = bd.getHours() * perHgh + (bd.getMinutes() * perHgh/60),
				bottom = ed.getHours() * perHgh + (ed.getMinutes() * perHgh/60),
				height = bottom - top,
				body = $e(ce, "body"),
				hd = $e(ce, "hd");

			ce.style.top = top + "px";
			zk.childNodes(ce, zkCalendars.isLegalChild).forEach(function (n) {
				height-= n.offsetHeight;
			});
			height = zk.revisedSize(body, height, true);
			height = zk.revisedSize(body.firstChild, height, true);
			var inner = body.firstChild.firstChild;
			height = zk.revisedSize(inner, height - 2, true);
			inner.style.height = height + "px";

			// width info
			var bi = zkCalendars.getTimeIndex(bd),
				ei = zkCalendars.getTimeIndex(ed);

			ce._bi = bi;
			ce._ei = ei;

			for (var i = 0; bi < ei && bi < 48;) {
				var tmp = data[bi++];
				if (tmp[i]) {
					for (;;) {
						if (!tmp[++i])
							break;
					}
				}
				tmp[i] = ce;
			}
		}

		// fix width
		for (var ce = cn[0]; ce; ce = ce.nextSibling) {
			var bd = ce._bd,
				bi = ce._bi,
				ei = ce._ei,
				maxSize = 0,
				tmp = {};

			for (var i = bi; i < ei && i < 48; i++) {
				var len = data[i].length;
				if (maxSize < len)
					maxSize =  len;
				for (var j = 0; j < len; j++) {
					if (!data[i][j] || tmp[data[i][j].id]) continue;
					tmp[data[i][j].id] = 1;
					var ei2 = data[i][j]._ei;
					if (ei < ei2)
						ei = ei2;
				}
			}

			var len = maxSize,
				width = 100/len
				index = data[bi].indexOf(ce);
			if (index == maxSize -1)
				ce.style.width = width + "%";
			else
				ce.style.width = (width * 1.7) + "%";
			ce.style.left = width * index + "%";

			var fce = ce.previousSibling,
				moved = false;

			// adjust the order
			while (fce) {
				if (data[fce._bi].indexOf(fce) > index) {
					fce = fce.previousSibling;
					moved = true;
				} else {
					if (moved) {
						var next = ce.nextSibling;
						zk.insertAfter(ce, fce);
						ce = next ? next.previousSibling: ce;
					}
					break;
				}
			}
		}

	},
	getTimeIndex: function (date) {
		return (date.getHours() * 2) + (date.getMinutes() >= 30 ? 1 : 0);
	},
	beforeSize: zk.ie6Only ? function (cmp) {
		var inner = $e(cmp, "inner");
		inner.style.height = "0px";
		inner.lastChild.style.height = "0px";
	} : zk.voidf,
	onSize: _zkf = function (cmp) {
		zkCalendars.clearGhost(cmp);
		var hgh = cmp.offsetHeight;
		if (!hgh) return;
		zk.childNodes(cmp, this.isLegalChild).forEach(function (n) {
			hgh-= n.offsetHeight;
		});
		var inner = $e(cmp, "inner");
		hgh = zk.revisedSize(inner.parentNode, hgh, true);
		hgh = zk.revisedSize(inner, hgh, true);
		inner.style.height = hgh + "px";
		hgh -= inner.firstChild.offsetHeight;
		hgh = zk.revisedSize(inner.lastChild, hgh, true);
		inner.lastChild.style.height = hgh + "px";

		// sync scrollTop
		var cnt = $e(cmp, "cnt"),
			row = zk.ie ? cnt.firstChild.rows[0].cells[0].firstChild.rows[1] :
					cnt.firstChild.rows[1];
		cnt.scrollTop = zkCalendars._scrollInfo[cmp.id];

		var offs = zk.revisedOffset(cnt),
			cells = row.cells,
			lefts = [];
		for (var s = $int(getZKAttr(cmp, "ts")), l = offs[0], n = cells[0]; n; n = n.nextSibling) {
			l += n.offsetWidth;
			if (--s <= 0)
				lefts.push(l);
		}
		cnt._lefts = lefts;

		zkCalendars.closeFloats();

		// scrollbar width
		var width = cnt.offsetWidth - cnt.firstChild.offsetWidth,
			table = cnt.previousSibling.firstChild;
		table.rows[0].lastChild.style.width = zk.revisedSize(table.rows[1].firstChild, width)+ "px";
	},
	isLegalChild: function (n) {
		if (!n.id.endsWith("!body"))
			return n;
	},
	onVisi: _zkf,
	setAttr: function (cmp, nm, val) {
		switch (nm) {
		case "z.cleardd":
			if (val == "true")
				zkCalendars.clearGhost(cmp);
			return true;
		}
		return false;
	}
};
zkCalendarsMonth = {
	_drag: {},
	_ghost: {},
	init: function (cmp) {
		var cnt = $e(cmp, "cnt"),
			rdata = [],
			zcls = getZKAttr(cmp, "zcls");
		
		if (getZKAttr(cmp, 'woy') == 'true') {
			zk.listen($e(cmp, 'woy'), "click", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					if (zkau.asap(cmp, 'onWeekClick')) {
						zkau.send({
							uuid: cmp.id,
							cmd: "onWeekClick",
							data: [getZKAttr(target, "time")]
						}, 50);
					}
					Event.stop(evt);
				}
			});
		}
		for (var ri = 0, n = cnt.firstChild; n; n = n.nextSibling, ri++) {
			var table = n.lastChild,
				rows = table.rows,
				len = rows.length,
				data = [];

			for (var i = 0, c = 7; c--; i++)
				data[i] = [];

			for (var i = 1; i < len; i++) {
				for (var k = 0, z = 0, cells = rows[i].cells; z + k < 7; k++) {
					if (cells[k].firstChild.id)
						data[k+z].push(cells[k].firstChild);
					var cols = cells[k].colSpan;
					while(--cols > 0)
						data[k+ ++z].push(cells[k].firstChild);
				}
			}
			rdata[ri] = data;
				
			zk.listen(rows[0], "mouseover", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					zk.addClass(target, zcls + "-day-over");
				}
			});
			zk.listen(rows[0], "mouseout", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					zk.rmClass(target, zcls + "-day-over");
				}
			});
			zk.listen(rows[0], "click", function (evt) {
				var target = Event.element(evt);
				if ($tag(target) == "SPAN") {
					if (zkau.asap(cmp, 'onDayClick')) {
						zkau.send({
							uuid: cmp.id,
							cmd: "onDayClick",
							data: [getZKAttr($parentByTag(target, "TD"), "bd")]
						}, 50);
					}
					Event.stop(evt);
				}
			});
		}
		cmp._evtsData = rdata;

		if (!getZKAttr(cmp, "readonly")) {
			zk.listen(cnt, 'click', function(evt) {
				if (!zk.dragging && !zkau.processing()) {
					zkCalendarsMonth.clearGhost(cmp);
					zkCalendarsMonth.onClick(cnt, evt);
				} else
					Event.stop(evt);
			});

			// a trick for dragdrop.js
			cnt._skipped = true;
			zkCalendarsMonth._drag[cnt.id] = new zDraggable(cnt, {
				starteffect: zkCalendarsMonth.closeFloats,
				endeffect: zkCalendarsMonth._enddrag,
				ghosting: zkCalendarsMonth._ghostdrag,
				change: zkCalendarsMonth._changedrag,
				draw: zkCalendarsMonth._drawdrag,
				ignoredrag: zkCalendarsMonth._ignoredrag
			});
			zk.listen(cmp, "click", zkCalendarsMonth.clearGhost);
		}
	},
	onClick: function (cnt, evt) {
		var ce;
		for (var n = Event.element(evt); n && n != cnt; n = n.parentNode) {
			if ($tag(n) == 'TR' && n.id.indexOf('!frow') > 0)
				return;
			else if ($type(n) == 'Calevent') {
				ce = n;
				break;
			}
		}
		if (ce) {
			zkau.send({uuid: $uuid(cnt), cmd: "onEventEdit", data: [ce.id,
				Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(),
				zk.innerHeight()]}, 100);
		} else {
			var cmp = $outer(cnt),
				zcls = getZKAttr(cmp, "zcls"),
				html = '<div id="' + cmp.id + '!rope" class="' + zcls + '-month-dd">'
					 + '<div class="' + zcls + '-dd-rope"></div></div>';

			document.body.insertAdjacentHTML("afterBegin", html);

			var td = cnt.firstChild.firstChild.rows[0].firstChild,
				width = td.offsetWidth,
				p = Event.pointer(evt),
				height = cnt.firstChild.offsetHeight,
				offs = zk.revisedOffset(cnt),
				x = p[0] - offs[0],
				y = p[1] - offs[1],
				cols = Math.floor(x/width),
				rows = Math.floor(y/height),
				bd = new Date($int(getZKAttr(cmp, "bd")) + (7 * rows + cols) * zkCalendars.DAYTIME);

			var zinfo = [];
			for (var left = 0, n = td; n;
					left += n.offsetWidth, n = n.nextSibling)
				zinfo.push({l: left, w: n.offsetWidth});

			var zoffs = {
				l: offs[0],
				t: offs[1],
				w: cnt.offsetWidth,
				h: cnt.offsetHeight,
				s: zinfo.length
			};

			var hs = [];
			hs[rows] = cnt.childNodes[rows].offsetHeight;

			zkCalendarsMonth._fixRope(zinfo, $e(cmp.id + '!rope').firstChild,
				cols, rows, zoffs, {w: width, h: hs[rows], hs: hs}, 1);


			// clean
			bd.setMilliseconds(0);
			zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime(),
				bd.getTime() + zkCalendars.DAYTIME,
				p[0], p[1],
				zk.innerWidth(), zk.innerHeight()]}, 100);

			zkCalendarsMonth._ghost[cmp.id] = function () {
				zk.remove($e(cmp.id, "rope"));
				delete zkCalendarsMonth._ghost[cmp.id];
			};
		}
		zkCalendarsMonth.closeFloats();
		Event.stop(evt);
	},
	_ignoredrag: function (cnt, p, evt) {
		if (zkau.processing()) return true;
		var cmp = $outer(cnt),
			zcls = getZKAttr(cmp, "zcls"),
			cls = zcls + "-evt-faker-more",
			ncls = zcls + "-evt-faker-nomore";

		zkCalendarsMonth.clearGhost(cmp);
		var n = Event.element(evt);
		if ($tag(n) == 'SPAN')
			if (zk.hasClass(n, zcls + "-month-date-cnt"))
				return true;

		for (; n && n != cnt; n = n.parentNode)
			if ((n.nodeType == 1 && zk.hasClass(n, cls)
				&& !zk.hasClass(n, ncls))
				|| ($type(n) == 'Calevent' && (!n.parentNode || getZKAttr(n, 'locked') == "true")))
				return true;

		return false;
	},
	_ghostdrag: function (dg, ghosting, evt) {
		if (ghosting) {
			var cnt = dg.element,
				ce = zkCalendars._getCalevent(evt, cnt),
				cmp = $outer(cnt);

			var zcls = getZKAttr($outer(cnt), "zcls"),
				html = '<div id="' + cmp.id + '!rope" class="' + zcls + '-month-dd">',
				rope = '<div class="' + zcls + '-dd-rope"></div>',
				hs = [];

			for (var n = cnt.firstChild; n; n = n.nextSibling) {
				html += rope;
				hs.push(n.offsetHeight);
			}

			html += '</div>';

			document.body.insertAdjacentHTML("afterBegin", html);

			var td = cnt.firstChild.firstChild.rows[0].firstChild,
				width = td.offsetWidth,
				p = Event.pointer(evt);

			dg._zinfo = [];
			for (var left = 0, n = td; n;
					left += n.offsetWidth, n = n.nextSibling)
				dg._zinfo.push({l: left, w: n.offsetWidth});

			dg._zoffs = zk.revisedOffset(cnt);
			dg._zoffs = {
				l: dg._zoffs[0],
				t: dg._zoffs[1],
				w: dg.handle.offsetWidth,
				h: dg.handle.offsetHeight,
				s: dg._zinfo.length
			};


			if (ce) {
				var faker = ce.cloneNode(true);
				faker.id = cmp.id + '!dd';
				zk.addClass(faker, zcls + '-evt-faker-dd');
				var h = ce.offsetHeight;
				faker.style.width = width + "px";
				faker.style.height = h + "px";
				faker.style.left = p[0] - (width/2) + "px";
				faker.style.top = p[1] + h + "px";
				
				var ces = $es(ce.id);				
				if (ces)
					for (var l = ces.length; l--;)
						zk.addClass(ces[l], zcls + '-evt-dd');
						
				document.body.insertBefore(faker, document.body.firstChild);
				dg.element = $e(cmp.id + '!dd');

				var tzOffset = $int(getZKAttr($outer(dg.handle), "tz")),
					bd = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "bd"))), tzOffset),
					ed = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "ed"))), tzOffset);

				if (ed.getHours() == 0 && ed.getMinutes() == 0 &&
						ed.getSeconds() == 0) {
					ed = new Date(ed.getTime() - 1000);
				}
				bd.setHours(0);
				bd.setMinutes(0);
				bd.setSeconds(0);
				bd.setMilliseconds(0);
				ed.setHours(23);
				ed.setMinutes(59);
				ed.setSeconds(59);
				ed.setMilliseconds(0);

				dg._zdur = Math.ceil((ed.getTime() - bd.getTime())/ zkCalendars.DAYTIME);
				dg._zevt = ce;
			}

			zkau.beginGhostToDIV(dg);

			dg._zdim = {w: width, h: hs[0], hs: hs};
			dg._zrope = $e(cmp, "rope");

			var x = p[0] - dg._zoffs.l,
				y = p[1] - dg._zoffs.t,
				cols = Math.floor(x/dg._zdim.w),
				rows = Math.floor(y/dg._zdim.h);

			dg._zpos = [cols, rows];

			// fix rope
			zkCalendarsMonth._fixRope(dg._zinfo, dg._zrope.firstChild, cols, rows, dg._zoffs, dg._zdim, dg._zdur);
		} else {
			zkau.endGhostToDIV(dg);

			// target is Calendar's event
			dg.element = dg.handle;
		}
	},
	_fixRope: function (infos, n, cols, rows, offs, dim, dur) {
		if (!n || !offs || !dim) return;

		n.style.top = dim.hs[rows] * rows + offs.t + "px";
		n.style.left = infos[cols].l + offs.l + "px";
		n.style.height = dim.hs[rows] + "px";

		if (!dur)
			n.style.width = dim.w + "px";
		else {
			var i =	offs.s - cols;
			if (dur < i)
				i = dur;


			var w = 0;
			for (var len = 0; len < i; len++)
				w += infos[cols + len].w;

			n.style.width = w + "px";
			dur -= i;

			if (dur && ++rows < dim.hs.length)
				zkCalendarsMonth._fixRope(infos, n.nextSibling, 0, rows, offs, dim, dur);
			else
				for (var e = n.nextSibling; e; e = e.nextSibling)
					e.style.cssText = "";
		}
	},
	_drawdrag: function (dg, p, evt) {
		if (dg.element.id.endsWith('!dd')) {
			var w = dg.element.offsetWidth,
				h = dg.element.offsetHeight,
				x = Event.pointerX(evt) - (w/2),
				y = Event.pointerY(evt) - h,
				x1 = dg._zoffs.l,
				y1 = dg._zoffs.t,
				w1 = dg._zoffs.w,
				h1 = dg._zoffs.h;
			if (x < x1)
				x = x1;
			else if (x + w > x1 + w1)
				x = x1 + w1 - w;

			if (y < y1)
				y = y1;
			else if (y + h > y1 + h1)
				y = y1 + h1 - h;
			dg.element.style.left = x + "px";
			dg.element.style.top = y + "px";
		}
	},
	_changedrag: function(dg, p, evt) {
		var x = p[0]
			y = p[1],
			x1 = dg._zoffs.l,
			y1 = dg._zoffs.t,
			w1 = dg._zoffs.w,
			h1 = dg._zoffs.h;
		if (x < x1)
			x = x1;
		else if (x > x1 + w1)
			x = x1 + w1;

		if (y < y1)
			y = y1;
		else if (y > y1 + h1)
			y = y1 + h1;

		x -= x1;
		y -= y1;

	 	var cols = Math.floor(x/dg._zdim.w),
			rows = Math.floor(y/dg._zdim.h),
			dur = dg._zdur,
			size = dg._zrope.childNodes.length;

		if (rows == size)
			--rows
		if (cols == dg._zoffs.s)
			cols = dg._zoffs.s - 1;

		if (!dg._zevt) {
		 	var c = dg._zpos[0],
				r = dg._zpos[1],
				b = dg._zoffs.s * r + c,
				e = dg._zoffs.s * rows + cols;

			dur = (b < e ? e - b: b - e) + 1;
			cols = b < e ? c : cols;
			rows = b < e ? r : rows;

		 } else {
		 	var total = dg._zoffs.s * size,
				count = dg._zoffs.s * rows + cols + dur;

			if (total < count)
				dur = total - (dg._zoffs.s * rows + cols);
		 }
		 if (!dg._zpos1 || dg._zpos1[2] != dur || dg._zpos1[0] != cols || dg._zpos1[1] != rows) {
		 	dg._zpos1 = [cols, rows, dur];
		 	zkCalendarsMonth._fixRope(dg._zinfo, dg._zrope.firstChild, cols, rows, dg._zoffs, dg._zdim, dur);
		 }
	},
	_enddrag: function (cnt, evt) {
		var dg = zkCalendarsMonth._drag[cnt.id];
		if (dg) {
			var cmp = $outer(cnt), ce;
			if (dg._zevt) {
				var zcls = getZKAttr(cmp, 'zcls'),
					tzOffset = $int(getZKAttr(cmp, "tz")),
					bd = zkCalendars.fixTimeZoneFromServer(
						new Date($int(getZKAttr(cmp, "bd")) + (dg._zoffs.s * dg._zpos1[1] + dg._zpos1[0]) * (zkCalendars.DAYTIME)), tzOffset),
					bd1 = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(dg._zevt, "bd"))), tzOffset);


				var ces = $es(dg._zevt);
				if (ces)
					for (var l = ces.length; l--;)
						zk.rmClass(ces[l], zcls + '-evt-dd');
					
				bd.setHours(bd1.getHours());
				bd.setMinutes(bd1.getMinutes());
				bd.setSeconds(bd1.getSeconds());
				bd1.setMilliseconds(0);
				bd.setMilliseconds(0);
				var offs = bd.getTime() - bd1.getTime();

				if (offs) {
					ce = dg._zevt;
					ce.style.visibility = "hidden";

					var ed = new Date($int(getZKAttr(dg._zevt, "ed")));
					ed.setMilliseconds(0);
					zkau.send({
						uuid: cmp.id,
						cmd: "onEventUpdate",
						data: [dg._zevt.id,
							$int(getZKAttr(dg._zevt, "bd")) + offs,
							ed.getTime() + offs,
							Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(), zk.innerHeight()]
					}, 100);
				} else
					zk.remove($e(cmp.id, "rope"));
				zk.remove($e(cmp.id, 'dd'));
			} else {
				var c = dg._zpos[0],
					r = dg._zpos[1],
					c1 = dg._zpos1[0],
					r1 = dg._zpos1[1],
					c2 = c < c1 ? c : c1,
					r2 = r < r1 ? r : r1,
					b = (dg._zoffs.s * r2 + c2) * zkCalendars.DAYTIME;

				var bd = new Date($int(getZKAttr(cmp, "bd")) + b);
					ed = new Date(bd.getTime() + dg._zpos1[2] * zkCalendars.DAYTIME);

				// clean
				bd.setMilliseconds(0);
				ed.setMilliseconds(0);
				zkau.send({uuid: cmp.id, cmd: "onEventCreate", data: [bd.getTime(),
					ed.getTime(), Event.pointerX(evt), Event.pointerY(evt),
					zk.innerWidth(), zk.innerHeight()]}, 100);
			}

			zkCalendarsMonth._ghost[cmp.id] = function () {
				ce = $e(ce);
				if (ce) ce.style.visibility = "";
				zk.remove($e(cmp.id, "rope"));
				delete zkCalendarsMonth._ghost[cmp.id];
			};
			dg._zinfo = dg._zpos1 = dg._zpos = dg._zrope = dg._zdim = dg._zdur = dg._zevt = null;
		}
	},
	closeFloats: function () {
		if (zkCalendarsMonth._pp) {
			zk.unlisten(document.body, "click", zkCalendarsMonth.unMoreClick);
			zk.remove(zkCalendarsMonth._pp);
			zkCalendarsMonth._pp = null;
		}
	},
	onSize: _zkf = function (cmp) {
		var woy = getZKAttr(cmp, 'woy') == 'true' ? $e(cmp, 'woy') : null; 
		if (woy) {
			var w = woy.offsetWidth,
				cnt = $e(cmp, 'cnt'),
				cs = cnt.style,
				ts = woy.previousSibling.style;
				
			ts.left = cs.left = w + "px";
			ts.width = cs.width = "";
			ts.width = cs.width = cnt.offsetWidth - w + "px";
		}
		zkCalendarsMonth.clearGhost(cmp);
		var hgh = cmp.offsetHeight;
		if (hgh === 0) return;
		zk.childNodes(cmp, this.isLegalChild).forEach(function (n) {
			hgh-= n.offsetHeight;
		});
		var inner = $e(cmp, "inner");
		hgh = zk.revisedSize(inner.parentNode, hgh, true);
		hgh = zk.revisedSize(inner, hgh, true);
		if (hgh < 250) hgh = 250;
		inner.style.height = hgh + "px";
		if (zk.ie6Only) {
			var inn = inner.firstChild;
			hgh = zk.revisedSize(inn, hgh, true);
			hgh -= inn.firstChild.offsetHeight;
			hgh = zk.revisedSize(inn.lastChild, hgh, true);
			inn.lastChild.style.height = hgh + "px";
			if (woy)
				woy.style.height = hgh + "px";
		}
		inner.style.overflowY = "visible";
		zkCalendarsMonth.fixVisiHgh(cmp);
		zkCalendarsMonth.closeFloats();
	},
	fixVisiHgh: function (cmp) {
		var cnt = $e(cmp, "cnt"),
			zcls = getZKAttr(cmp, "zcls");

		for (var ri = 0, n = cnt.firstChild; n; n = n.nextSibling, ri++) {
			var h = n.offsetHeight,
				sh = n.lastChild.offsetHeight,
				table = n.lastChild,
				rows = table.rows,
				len = rows.length;
			if (len > 1 && (h < sh || rows[len-1].id)) {
				if (rows[len-1].id && rows[len-1].id.startsWith(cmp.id + "!frow")) {
					zk.remove(rows[len-1]);
					len--;
				}
				rows[1].style.display = "";
				var nh = zk.offsetHeight(rows[1]);
				h -= zk.offsetHeight(rows[0]) + nh;

				var vc = Math.floor(h/nh),
					vc1 = vc,
					data = cmp._evtsData[ri];

				for (var i = 1; i < len; i++)
					rows[i].style.display = --vc < 0 ? "none" : "";

				var faker = table.insertRow(len);
				faker.id = cmp.id + "!frow" + ri;
				for (var i = 7; i--;) {
					cell = faker.insertCell(0);
					cell.className = zcls + "-month-date-evt";
					zk.addClass(cell, zcls + "-evt-faker-more");
					if (data[i].length - vc1 > 0) {
						var evts = data[i];
						cell.innerHTML = "+" + (evts.length - vc1) + "&nbsp;" + msgcal.MORE;
						zk.listen(cell, "click", zkCalendarsMonth.onMoreClick);
					} else {
						cell.innerHTML = "";
						zk.addClass(cell, zcls + "-evt-faker-nomore");
					}
				}
			}
		}
	},
	getIndex: function (ele) {
		for (var i = 0, n = ele.parentNode.firstChild; n; n = n.nextSibling, ++i)
			if (n == ele) return i;
		return -1;
	},
	onMoreClick: function (evt) {
		var cell = Event.element(evt),
			row = cell.parentNode.parentNode.parentNode.parentNode,
			uuid = $uuid(row.parentNode),
			ci = cell.cellIndex;

		zkCalendarsMonth.clearGhost($e(uuid));
		var pp, table = $e(uuid, "ppcnt");
		if (!zkCalendarsMonth._pp) {
			pp = document.createElement("DIV");
			document.body.appendChild(pp);
			zk.setOuterHTML(pp, zkCalendars.ppTemplate.replace(new RegExp("%([1-2])", "g"), function (match, index) {
				return index < 2 ? uuid : 'z-calpp-month';
			}));
			zkCalendarsMonth._pp = pp = $e(uuid, "pp");
			zk.listen(document.body, "click", zkCalendarsMonth.unMoreClick);
			table = $e(uuid, "ppcnt");

			if(!getZKAttr($e(uuid), "readonly"))
				zk.listen(pp, "click", zkCalendarsMonth.onPopupClick);
		} else {
			if (getZKAttr(zkCalendarsMonth._pp, "ci") == ci) {
				// ignore onEventCreate
				Event.stop(evt);
				return;
			}

			for (var i = table.rows.length; i--;)
				zk.remove(table.rows[0]);
			pp = zkCalendarsMonth._pp;
		}

		setZKAttr(pp, "ci", ci);

		var date = cell.parentNode.parentNode.firstChild.cells[ci];
		$e(uuid, "pphd").innerHTML = getZKAttr(date, "pt");

		if (zk.ie6Only) {
			var close = $e(uuid, "ppc");
			zk.listen(close, "mouseover", function() {zk.addClass(close, "z-calpp-month-close-over")});
			zk.listen(close, "mouseout", function() {zk.rmClass(close, "z-calpp-month-close-over")});
		}

		var offs= zk.revisedOffset(row.lastChild.rows[0].cells[ci]),
			csz = cell.parentNode.cells.length,
			single = cell.offsetWidth,
			wd = single*3*0.9;

		if (ci > 0)
			if (csz != ci+1)
				pp.style.left = offs[0] - (wd - single)/2 + "px";
			else
				pp.style.left = offs[0] - (wd - single) + "px";
		else pp.style.left = offs[0] + "px";

		pp.style.top = offs[1] + "px";
		pp.style.width = wd + "px";

		//filling data
		var cmp = $e(uuid),
			evts = cmp._evtsData[zkCalendarsMonth.getIndex(row)][ci],
			oneDay = 60*60*24*1000,
			tzOffset = $int(getZKAttr(cmp, "tz")),
			bd = zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(date, "bd"))), tzOffset),
			ed = new Date(bd.getTime() + oneDay);

		for (var i = evts.length; i--;) {
			var tr = table.insertRow(0),
				ce = evts[i],
				cr = tr.insertCell(0),
				cm = tr.insertCell(0),
				cl = tr.insertCell(0),
				hc = getZKAttr(ce, 'hc'),
				cc = getZKAttr(ce, 'cc'),
				zcls = getZKAttr(ce, 'zcls');

			ce._bd = ce._bd || zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "bd"))), tzOffset);
			ce._ed = ce._ed || zkCalendars.fixTimeZoneFromServer(new Date($int(getZKAttr(ce, "ed"))), tzOffset);
			cl.className = "z-calpp-month-evt-l";
			if (bd.getTime() - ce._bd.getTime() >= 1000) {
				var info = [
						ce.id + "!fl",
						zcls,
						zcls + "-left",
						ce._bd.getMonth() + 1 + "/" + ce._bd.getDate(),
						hc ? ' style="background:' + hc + '"' : '',
						cc ? ' style="background:' + cc + '"' : '',
						cc ? ' style="border-bottom-color:' + cc + ';border-top-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + ';border-left-color:' + cc + ';border-right-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + '"' : ''
					];
				cl.innerHTML = zkCalendars.evtTemplate.replace(new RegExp("%([1-9])", "g"), function (match, index) {
					return info[index - 1];
				});
			} else
				cl.innerHTML = "";
			cm.className = "z-calpp-month-evt-m";
			var faker = ce.cloneNode(true);
			zk.addClass(faker, "z-calpp-month-evt-faker");
			cm.appendChild(faker);
			cr.className = "z-calpp-month-evt-r";

			if (ce._ed.getTime() - ed.getTime() >= 1000) {
				var d = new Date(ce._ed.getTime() - 1000),
					info = [
						ce.id + "!fr",
						zcls,
						zcls + "-right",
						d.getMonth() + 1 + "/" + d.getDate(),
						hc ? ' style="background:' + hc + '"' : '',
						cc ? ' style="background:' + cc + '"' : '',
						cc ? ' style="border-bottom-color:' + cc + ';border-top-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + ';border-left-color:' + cc + ';border-right-color:' + cc + '"' : '',
						cc ? ' style="background:' + cc + '"' : ''
					];
				cr.innerHTML = zkCalendars.evtTemplate.replace(new RegExp("%([1-9])", "g"), function (match, index) {
					return info[index - 1];
				});
			} else
				cr.innerHTML = "";
		}
		zk.cleanVisibility(pp);
		Event.stop(evt);
	},
	unMoreClick: function (evt) {
		var target = Event.element(evt);
		if (target.id.endsWith("!ppc") || !zkCalendars.isAncestor(zkCalendarsMonth._pp, target))
			zkCalendarsMonth.closeFloats();
	},
	onPopupClick: function (evt) {
		var pp = zkCalendarsMonth._pp,
			ce = zkCalendars._getCalevent(evt, pp);
		if (ce) {
			zkau.send({uuid: $uuid(pp), cmd: "onEventEdit", data: [$uuid(ce),
				Event.pointerX(evt), Event.pointerY(evt), zk.innerWidth(),
				zk.innerHeight()]}, 100);
			Event.stop(evt);
		}
	},
	beforeSize: zk.ie6Only ? function (cmp) {
		$e(cmp, "inner").style.height = "0px";
		$e(cmp, "cnt").style.height = "0px";
	} : zk.voidf,
	isLegalChild: function (n) {
		if (!n.id.endsWith("!body"))
			return n;
	},
	onVisi: _zkf,
	clearGhost: function (cmp) {
		cmp = $parentByType(zkau.evtel(cmp), "CalendarsMonth");
		if (cmp) {
			if (zkCalendarsMonth._ghost[cmp.id])
				zkCalendarsMonth._ghost[cmp.id]();
		} else {
			for (var f in zkCalendarsMonth._ghost)
				zkCalendarsMonth._ghost[f]();
		}
	},
	cleanup: function (cmp) {
		zkCalendarsMonth.clearGhost(cmp);
		// just in case
		zkCalendarsMonth.closeFloats();
	},
	setAttr: function (cmp, nm, val) {
		switch (nm) {
		case "z.cleardd":
			if (val == "true")
				zkCalendarsMonth.clearGhost(cmp);
			return true;
		}
		return false;
	}
};