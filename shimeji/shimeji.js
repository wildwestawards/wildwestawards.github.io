var obj;

async function initShimeji() {
	await fetch('./shimeji/config.json')
		.then(response => response.json())
		.then(data => {obj = data;})
		.catch(error => console.log(error));
	spawnAllShimeji();
}
function spawnAllShimeji() {
	for (var i = 0; i < obj.shimejis.length; i++) {
		spawnShimeji(i);
	}
}
function spawnShimeji(index) {
		var shimejiname = obj.shimejis[index].id;
		this[shimejiname] = new shimeji(index);
		this[shimejiname].spawn();
}
class shimeji {
	constructor(index) {
		this.id = obj.shimejis[index].id;
		this.definition_id = obj.shimejis[index].definition_id;
		var definition_path;
		var definition;

		var x;
		var y;
		var mouse_x;
		var mouse_y;
		var last_x;
		var last_y;
		var xv;
		var yv;

		var	playspace;
		var container;
		var object;

		var loop;
		var timer;
		var extend_timer;
		var state;
		var direction;
		var disable_gravity;
		var bounce;
		var slide;
	}
	async spawn() {
		this.definition_path = obj.path + this.definition_id + "/definition.json";
		
		await fetch(`${this.definition_path}`)
			.then(response => response.json())
			.then(data => {this.definition = data;})
			.catch(error => console.log(error));

		this.timer = 0;
		this.state = 0;
		this.direction = 0;
		this.extend_timer = 0;
		this.disable_gravity = 0;
		this.bounce = 0;
		this.slide = 0;
		this.playspace = document.getElementById("playspace");
		this.container = document.createElement("div");
		this.object = document.createElement("div");

		this.playspace.appendChild(this.container);
		this.container.appendChild(this.object);

		this.container.setAttribute("id", this.id + "_container");
		this.object.setAttribute("id", this.id);

		this.object.style.height = this.definition.parameters.size_x + obj.playspace.units;
		this.object.style.width = this.definition.parameters.size_y + obj.playspace.units;

		this.x = Math.floor(Math.random() * (obj.playspace.x - this.definition.parameters.size_x));
		this.y = (obj.playspace.y + playspace.offsetTop) - this.definition.parameters.size_y;
		this.xv = 0;
		this.yv = 0;

		this.container.style.position = "absolute";
		this.object.style.top = (this.y - playspace.offsetTop) + obj.playspace.units;

		this.object.style.position = "relative";
		this.object.style.left = this.x + obj.playspace.units;
		
		this.object.style.draggable = false;
		this.object.style.backgroundImage = "url(\"" + obj.path + this.definition_id + "/images/" + this.definition.states[0].sprite + "\")";

		this.container.style.pointerEvents = "none";
		this.object.style.pointerEvents = "auto";
		this.container.style.userSelect = "none";
		this.container.setAttribute("draggable", false);
		this.object.setAttribute("draggable", false);

		this.object.onmousedown = this.mouseBehavior.bind(this);
		
		this.startBehavior();

		console.log("Created Shimeji with ID: " + this.id);
	}
	startBehavior() {
		
		// calculate direction
		
		switch (this.direction) {
			case 0:
				this.object.style.transform = "scaleX(1)";
				break;
			case 1:
				this.object.style.transform = "scaleX(-1)";
				break;
		}
		
		// calculate position

		if (this.disable_gravity == 0) {
			this.x = this.x + this.xv;
			this.y = this.y + this.yv;
			this.yv = this.yv + this.definition.parameters.gravity;
			if (checkSlide(this)) {
				if (this.xv > 0) {
					this.xv = Math.floor(Math.max((this.xv - (this.definition.parameters.gravity / 10)), 0));
				} else if (this.xv < 0) {
					this.xv = -Math.floor(Math.max((-this.xv - (this.definition.parameters.gravity / 10)), 0)); // fucked up and evil hack
				} else {
					this.slide = 0;
					this.state = Math.floor(Math.random() * 3);
					this.direction = Math.floor(Math.random() * 2);	
				}
			}
		}
		if (this.x > (obj.playspace.x - this.definition.parameters.size_x) || this.x < 0) {
			if (this.definition.parameters.can_bounce && (this.xv > (this.definition.parameters.size_x / 2) || this.xv < -(this.definition.parameters.size_x / 2))) {
				this.xv = -this.xv / 2;
				playSound(this, this.definition.sounds.bounce);
			} else {
				this.bounce = 0;
				this.xv = 0;
				this.slide = 0;
			}
			this.x = Math.min(Math.max(this.x, 0), (obj.playspace.x - this.definition.parameters.size_x));
			this.timer = 0;
		}
		if (this.y > (obj.playspace.y - this.definition.parameters.size_y + playspace.offsetTop) || this.y < playspace.offsetTop) {
			if (this.definition.parameters.can_bounce &&  (this.yv > (this.definition.parameters.size_y / 2) || this.yv < -(this.definition.parameters.size_y / 2))) {
				this.bounce = 1;
				this.yv = -this.yv / 2;
				playSound(this, this.definition.sounds.bounce);
			} else {
				this.bounce = 0;
				this.yv = 0;
			}
			this.y = Math.min(Math.max(this.y, playspace.offsetTop), (obj.playspace.y - this.definition.parameters.size_y + playspace.offsetTop));
		}
		this.object.style.left = this.x + obj.playspace.units;
		this.object.style.top = (this.y - playspace.offsetTop) + obj.playspace.units;
		
		// while timer is more than 0, decrement timer and proceed with action
		// if it's 0, randomize to a state and make new timer
		// the state randomization is actually not random, as it flips between doing something and standing

		switch (this.timer) {
			case 0: // when timer is 0
				if (isOnGround(this) && checkGravBounce(this) && this.slide == 0) {
					switch (this.state) {
						case 0:
						case 3:
						case 4:
							this.state = Math.floor(Math.random() * 3);
							break;
						case 5:
						default:
							this.state = 0;
							break;
					}
					this.direction = Math.floor(Math.random() * 2);
					this.timer = (Math.floor(Math.random() * 10) + 1) * 10;
					break;
				}
			default: // decrement timer if other than 0
				this.timer--;
				switch (this.state) {
					case 0:
						this.xv = 0;
						break;
					case 1:
						if (this.extend_timer == 0) {
							this.timer = this.timer * 60;
							this.extend_timer = 1;
						}
						break;
					case 2:
						switch (this.direction) {
						case 0:
							this.xv = this.definition.parameters.step_dist;
							break;
						case 1:	
							this.xv = -this.definition.parameters.step_dist;
							break;
						}
						break;
					case 3:
					case 4:
					case 5:
						if (isOnGround(this) && checkGravBounce(this)) {
							this.timer = 0;
							this.state = 5;
						}
						break;
					}
				break;
		}
		// set sprite depending on state

		this.object.style.backgroundImage = "url(\"" + obj.path + this.definition_id + "/images/" + this.definition.states[this.state].sprite + "\")";
		
		// now run this again

		this.loop = setTimeout(this.startBehavior.bind(this), 16.67); 

		function playSound(what, sound) {
			var fullsndpath = obj.path + what.definition_id + "/sounds/" + sound;
			let s = new Audio(fullsndpath);
			s.play();
		}
		function isOnGround(what) {
			return what.y == (obj.playspace.y - what.definition.parameters.size_y + playspace.offsetTop);
		}
		function checkGravBounce(what) {
			return what.disable_gravity == 0 && what.bounce == 0;
		}
		function checkSlide(what) {
			return isOnGround(what) && what.slide == 1 && what.definition.parameters.can_slide == 1;
		}
	}
	mouseBehavior(e) {
		document.onmouseup = this.releaseDrag.bind(this);
		if (this.definition.parameters.is_grabbable)
		{
			document.onmousemove = this.dragBehavior.bind(this);
		}

		console.log("Booped " + this.id);
		console.log("Clicked from " + (e.clientX - playspace.offsetLeft));
		console.log(this.id + " at " + ((this.x) + (this.definition.parameters.size_x / 2)));
		this.timer = (Math.floor(Math.random() * 10) + 1) * 10;
		switch (this.state) {
			case 0:
				this.state = 2;
				if ((e.clientX - playspace.offsetLeft) < ((this.x) + (this.definition.parameters.size_x / 2))) {
					this.direction = 0;
				} else {
					this.direction = 1;
				}
				break;
			case 3:
			case 4:
			case 5:
				break;
			default:
				this.state = 0;
				if ((e.clientX - playspace.offsetLeft) > ((this.x) + (this.definition.parameters.size_x / 2))) {
					this.direction = 0;
				} else {
					this.direction = 1;
				}
				break;
		}
	}
	dragBehavior(e) {
		this.mouse_x = Math.min(Math.max((e.clientX - playspace.offsetLeft), 0), (obj.playspace.x));
		this.mouse_y = Math.min(Math.max((e.clientY - playspace.offsetTop), playspace.offsetTop), (obj.playspace.y - playspace.offsetTop));
		
		switch (this.disable_gravity) {
			case 0:
				this.disable_gravity = 1;
				this.xv = 0;
				this.yv = 0;
				break;
			default:
				this.last_x = this.x;
				this.last_y = this.y;
				break;
		}
		this.state = 3;
		this.x = this.mouse_x - (this.definition.parameters.size_x / 2);
		this.y = this.mouse_y;
		
		this.xv = this.x - this.last_x;
		this.yv = this.y - this.last_y;
	}
	releaseDrag(e) {
		if (this.state == 3 || this.state == 4) {
			this.state = 4;
			if (this.definition.parameters.can_slide) {
				this.slide = 1;
			}
		} else {
			this.xv = 0;
		}
		this.disable_gravity = 0;
		document.onmouseup = null;
		document.onmousemove = null;
	}
	stopBehavior() {
		clearTimeout(this.loop); 		
		console.log("Stopped behavior for ID: " + this.id);
	}
	explode() {
		var g = document.createElement("img");
		g.src = "shimeji/explosion_e0.gif";
		this.object.appendChild(g);
		
		g.style.position = "absolute";
		g.style.height = this.definition.parameters.size_x + obj.playspace.units;
		g.style.width = this.definition.parameters.size_y + obj.playspace.units;
		
		var s = new Audio('shimeji/snd_badexplosion_ch1.mp3');
		s.play();
		
		setTimeout(() => {
			g.remove();
		}, 1700);

		console.log("> There should be a button to make them all explode");
		console.log("> No harm done, they dont disappear or anything, they just explode");
	}
	remove()
	{
		var r = this;
		
		r.stopBehavior();
		r.object.remove();
		r.container.remove();

		console.log("Removed ID:" + this.id);
	}
	list()
	{
		return this.definition;
	}
	printPos()
	{
		console.log(this.x + ", " + this.y);
	}
}
// debug functions

function listPlayspace(){
	console.log(obj.playspace);
}
function explodeAllShimeji(){
	for (var i = 0; i < obj.shimejis.length; i++) {
		var shimejiname = obj.shimejis[i].id;;
		this[shimejiname].explode();
	}
}
function listAllShimeji(){
	for (var i = 0; i < obj.shimejis.length; i++){
		console.log(obj.shimejis[i]);
	}
}