/* Calendars.js

	Purpose:
		
	Description:
		
	History:
		Thu Nov  5 12:33:21 TST 2009, Created by Jimmy

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

This program is distributed under GPL Version 3.0 in the hope that
it will be useful, but WITHOUT ANY WARRANTY.
 */
calendar.Event = zk.$extends(zk.Widget, {
	DAYTIME: 24*60*60*1000,
	
	bind_ : function() {
		this.$supers('bind_', arguments);
		this.calculate_();
	},
	
	unbind_: function() {
		var node = this.$n();
		
		node.zoneBd = node.zoneEd = node._preOffset = node._afterOffset = 
		node._days = this.event = null;	
		this.$supers('unbind_', arguments);
	},
	
	defineClassName_: function() {
		var zcls = this.getZclass();
		// round corner
		this.t1 = zcls + "-t1";
		this.t2 = zcls + "-t2";
		this.t3 = zcls + "-t3";
		this.b1 = zcls + "-b1";
		this.b2 = zcls + "-b2";
		this.b3 = zcls + "-b3";
		// CSS ClassName
		this.body = zcls + "-body";
		this.inner = zcls + "-inner";
		this.content = zcls + "-cnt";
		this.text = zcls + "-text";
		
		var ce = this.event,
			headerColor = ce.headerColor,
			contentColor = ce.contentColor;
		this.headerStyle = headerColor ? ' style="background:' + headerColor + '"': '' ;
		this.contentStyle = contentColor ? ' style="background:' + contentColor + '"': '' ;
		
		this.uuid = ce.id;
	},
	
	defineCss_: function() {	
		var ce = this.event,
			headerColor = ce.headerColor,
			contentColor = ce.contentColor;
			
		this.headerStyle = headerColor ? 'background:' + headerColor: '';
		this.contentStyle = contentColor ? 'background:' + contentColor: '';
	},
	
	updateHeaderStyle_: function(headerStyle) {
		var node = jq(this.$n()),
			body = jq(this.$n('body'));
		node.children('.' + this.t1).attr('style', headerStyle);
		node.children('.' + this.t2).attr('style', headerStyle);
		node.children('.' + this.b1).attr('style', headerStyle);
		node.children('.' + this.b2).attr('style', headerStyle);
		body.attr('style',headerStyle);
		body.children('.' + this.inner).attr('style', this.getInnerStyle_());
	},
		
	getZclass: function() {
		var zcls = this.event.zclass;
		return zcls ? zcls: "z-calevent";
	},
	
	getInnerStyle_: function() {
		return this.headerStyle;
	},
	
	calculate_: function() {
		var node = this.$n(),
			event = this.event,
			parent = this.parent,
			bd = event.zoneBd,
			ed = event.zoneEd,
			inMon = parent.mon;
		
		if(inMon)
			node.startWeek = this._getStartWeek_(parent._weekDates);
		
		var time = inMon ? node.startWeek: parent;		

		node.zoneBd = bd;
		node.zoneEd = ed;
		
		this._createBoundTime(node, bd, ed);		
		
		//aftOffset could be calculated using bound time after processing clone node
		if (this.processCloneNode_)
			this.processCloneNode_(node);
		
		node._preOffset = this._getOffset({start: time.zoneBd, end: node.upperBoundBd});		
		if (this._isDayEvent()) return;		
			
		node._afterOffset = this.cloneCount ? 0:
								this._getOffset({start: node.lowerBoundEd, end: time.zoneEd});
		
		node._days = this.getDays();
	},

	_createBoundTime: function(node, bd, ed) {
		//have findBoundTime_ function
		if (this.findBoundTime_) {
			var time = this.findBoundTime_(bd, ed);
			bd = time.bd;
			ed = time.ed;
		}
		node.upperBoundBd = this._setBoundDate(bd);
		if (this._isDayEvent()) return;
		node.lowerBoundEd = this._setBoundDate(ed, this.DAYTIME);
	},
	
	_isDayEvent: function() {
//		zk.log(this.$instanceof(calendarDayEvent));		
		if (!this._isDayEvt)
			this._isDayEvt = this.className == 'calendar.DayEvent';
		return this._isDayEvt;	
	},
	
	_getOffset: function(time) {
		return (time.end.getTime() - time.start.getTime()) / this.DAYTIME;	
	},
	
	_getStartWeek_: function(weekDates) {		
		var bd = this.event.zoneBd;
		
		if (bd < this.parent.zoneBd)
			return weekDates[0];			
			
		var	len = weekDates.length
			pos = Math.floor(len * 0.5),
			result = weekDates[pos],
			isFind = (result.zoneBd <= bd && bd <= result.zoneEd);
				
		while(!isFind){			
			pos = bd < result.zoneBd ? Math.floor(pos * 0.5):
										Math.floor(pos * 1.5);
			if(pos >= len)
				return weekDates[len - 1];
										
			result = weekDates[pos];
			isFind = (result.zoneBd <= bd && bd <= result.zoneEd);
		}
		
		return result;
	},
		
	_setBoundDate: function(date,ONE_DAY) {
		var result = new Date(date.getTime());
		if (date.getHours() + date.getMinutes() + date.getSeconds() + date.getMilliseconds() != 0){
			if (ONE_DAY) 
				result.setTime(date.getTime() + ONE_DAY);
			
			result.setHours(0);
			result.setMinutes(0);
			result.setSeconds(0);
			result.setMilliseconds(0);
		}
		return result;
	}
});