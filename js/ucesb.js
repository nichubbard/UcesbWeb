/*
 * ucesb Live DAQ Javascript
 */

var subsystems = {}
var last_msg = {}

var filters = {
	time: function(value) {
		if (!value) return "No Date";
		value -= 37; // TAI correction to UTC (2021 only, hack)
		var date = new Date(value * 1000);
		var dtf = new Intl.DateTimeFormat([], {
			dateStyle: 'short',
			timeStyle: 'long',
		});
		return dtf.format(date);
	},

	hex: function(value) {
        if (typeof(BigInt) == 'function') {
            return "0x" + BigInt(value || 0).toString(16);
        }
        else {
            return "0x" + Number(value || 0).toString(16);
        }
	},

	suffix_s: function(value) {
		return (value || "0") + "/s";
	},

	suffix_hz: function(value) {
		return (value || "0") + " Hz";
	},

	subsystem_cleanup: function(value) {
		switch (value) {
			case "FAT. VME":
			return "FATIMA VME";
			case "FAT. TMX":
			return "FATIMA TAMEX";
			default:
			return value;
		}
	},

	seetram: function(value) {
        var counts = Number(value);
        var particles = seetram_cal(counts) || 0;
        return particles.toExponential(2) + " ions";
    }

};

// Functions for advanced callback
// return true to spot the default html() setting
var jses = {
	correlation: function(j, data, all_data) {
		var style = "table-warning";
		if (data == "GOOD") style = "table-success";
		else if (data == "BAD") style = "table-danger";

		j.removeClass('table-success table-danger table-warning').addClass(style);

		return false;
	},

	check_zero: function(j, data, all_data) {
		j.removeClass('text-danger');
		if (!data) j.addClass('text-danger');

		return false;
	},

	column_rate: function(j, data, all_data) {
		j.text((data.rate || 0) + "/s");
		j.removeClass('text-danger');
		if (!data.rate) {
			j.addClass('text-danger');
		}
		j.show();

		if (!data.active) {
			j.hide();
		}

		return true;
	},

	column_pulser: function(j, data, all_data) {
		j.text((data.pulser || 0) + "/s");
		j.removeClass('text-danger');
		if (!data.pulser) {
			j.addClass('text-danger');
		}
		j.show();

		if (!data.active) {
			j.hide();
		}

		return true;
	},

	column_nodata: function(j, data, all_data) {
		j.removeAttr("hidden");
		if (!data.active) {
			j.show();
		}
		else {
			j.hide();
		}

		return true;
	},


	log: function(j, data, all_data) {
		j.removeClass('text-danger text-warning');
		if (data.severity == "WARNING") j.addClass("text-warning");
		if (data.severity == "ERROR") j.addClass("text-danger");

		// parse ucesb log escape codes
		var message = "";
		for (var i = 0; i < data.message.length; i++)
		{
			if (data.message[i] == "\033") {
				var code = data.message[i + 1];
				switch(code) {
					case 'A':
						message += "<span class=\"font-weight-bold\">";
						break;
					case 'B':
						message += "</span>";
						break;
					case 'C':
						message += "<span class=\"text-danger\">";
						break;
					case 'D':
						message += "<span class=\"text-success\">";
						break;
					case 'E':
						message += "<span class=\"text-primary\">";
						break;
					case 'F':
						message += "<span class=\"text-secondary\">";
						break;
					case 'G':
						message += "<span class=\"text-info\">";
						break;
					case 'H':
					case 'I':
					case 'J':
						message += "<span>";
						break;
				}
				i += 1;
				continue;
			}
			message += data.message[i];
		}
		j.html(message);
		return true;
	},

	beamspill: function(j, data, all_data) {
		j.removeClass('text-custom');
		if (!subsystems[0x100]) {
			j.html("No FRS");
			j.addClass('text-custom');
			j.removeClass('bg-danger text-white');
			return true;
		}
		if (data.onspill) {
			j.html("On spill");
			j.removeClass('bg-danger text-white');
			j.removeClass("text-custom");
		}
		else {
			let lastday = new Date((data.lastspill || 0) * 1000);
			let now = new Date(data.time * 1000);
			if (now - lastday > 60000) {
				j.html("No beam");
				j.addClass('bg-danger text-white');
				j.removeClass("text-custom");
			}
			else {
				j.html("Off spill");
				j.removeClass('bg-danger text-white');
				j.removeClass("text-custom");
			}
		}
		return true;
	},

	spilllen: function(j, data, all_data) {
	  if (data.spilltime && data.extrtime) {
	    j.html((Math.round(data.spilltime / 500) / 2) + " s, Extraction Time: " + (Math.round(data.extrtime / 500) / 2) + " s");
	    j.parent().show();
	  }
	  else {
	    j.parent().hide();
	  }
	  return true;
	},

	scale_sci41: function(j, data, all_data) {
		let sc41 =  all_data.scalers.frs[49].spill;
		j.html((Math.round(data / sc41 * 100)) + "%");
		return true;
	}
};

var scaler_bases = {}
var last_spill_ctr = undefined;

function ucesbJsonFixup(data) {
	if (data.scalers) {
		var new_spill = false;
		if (singleShot && data.summary.spillCtr !== last_spill_ctr) {
		  new_spill = true;
		}
		last_spill_ctr = data.summary.spillCtr;
		var scalers = {}
		for (var scaler of data.scalers) {
			if (scaler.scalers === undefined) continue;
			scalers[scaler.key] = {}
			if (scaler_bases[scaler.key] === undefined) scaler_bases[scaler.key] = {};
			if (new_spill) {
				for (var item of scaler.scalers) {
					if (item.index === undefined) item.index = 0;
					if (scaler_bases[scaler.key][item.index] === undefined) scaler_bases[scaler.key][item.index] = 0;
					if (item.lastSpill === undefined) item.lastSpill = 0;
					if (item.index == 49) {
						console.log("scaler_bases[%s][%d] += %d ; %d => %d", scaler.key, item.index, item.lastSpill, scaler_bases[scaler.key][item.index], scaler_bases[scaler.key][item.index] + item.lastSpill);
					}
					scaler_bases[scaler.key][item.index] += item.lastSpill;
				}
			}
			for (var item of scaler.scalers) {
				if (item.index === undefined) item.index = 0;
				if (scaler_bases[scaler.key][item.index] === undefined) scaler_bases[scaler.key][item.index] = 0;
				if (item.spill === undefined) item.spill = 0;
				scalers[scaler.key][item.index] = { "rate": item.rate, "spill": scaler_bases[scaler.key][item.index] + item.spill };
			}
		}

		data.scalers = scalers;
	}

	if (data.status && data.status.daq) {
		$("[data-ucesb-subsystem]").hide();
		subsystems = {}
		for (var daq of data.status.daq) {
			if (daq.active) {
				subsystems[daq.id] = true;
				$("[data-ucesb-subsystem~='0x" + daq.id.toString(16) + "']").show();
			}
			else {
				subsystems[daq.id] = false;
				//$("[data-ucesb-subsystem='0x" + daq.id.toString(16) + "']").hide();
			}
		}
	}

	return data;
}

function toggleChevron(e) {
    $(e.target)
        .prev('.collapser-heading')
        .find('i.indicator')
        .toggleClass('fa-chevron-down fa-chevron-up');
}
$('.collapser-body').on('hide.bs.collapse show.bs.collapse', toggleChevron);

function jsonFromPath(obj, path) {
	if (path == ".") return obj;
	return path.split('.').reduce(function(o, k) {
		return o && o[k];
	}, obj);
}

function magicJsonBinding(object, key, data, all_data) {
	object.each(function() {
		var attr = $(this).attr(key);
		var value = jsonFromPath(data, attr);

		var js = $(this).attr('data-ucesb-js')
		if (js) {
			if(jses[js]($(this), value, all_data)) return;
		}

		var filter = $(this).attr('data-ucesb-filter');
		if (filter) {
			value = filters[filter](value);
		}
		if (value) {
			$(this).html(value);
		}
		else {
			$(this).html($(this).attr('data-ucesb-default') || '?');
		}
	});
}

var singleShotState = 0;
if (typeof singleShot === "undefined")
{
	var singleShot = false;
}
if (typeof singleShotCounter === "undefined")
{
  	var singleShotCounter = 1;
}

function updateFromJson(data) {
	data = ucesbJsonFixup(data);

    last_msg = data;

	if (singleShot)
	{
		switch (singleShotState)
		{
			// Waiting for OFF SPILL
			case 0:
				if (!data.summary.onspill) {
					singleShotState = 1;
					$("[class*='singleshot-stage']").hide();
					$(".singleshot-stage-1").show();
				}
				break;
			// Waiting for ON SPILL
			case 1:
				if (data.summary.onspill) {
					singleShotState = 2;
					console.log("Resetting scaler bases");
					scaler_bases = {};
					$("[class*='singleshot-stage']").hide();
					$(".singleshot-stage-2").show();
				}
				break;
			// Waiting for OFF SPILL
			case 2:
				if (!data.summary.onspill) {
				    if (singleShotCounter-- == 0)
				    {
					singleShotState = 3;
					$("[class*='singleshot-stage']").hide();
					$(".singleshot-stage-3").show();
				    }
				    else
				    {
				      singleShotState = 4;
				    }
				    $(".singleshot-spills-left").html(singleShotCounter);
				}
				break;
			// End of spill, stop forever
			case 3:
				return;
		        // Waiting for ON SPILL for additional
		        case 4:
			      if (data.summary.onspill) {
				singleShotState = 2;
			      }
			      break;
		}
	}

	//magicJsonBinding('data-ucesb-json', data);
	//$('[data-ucesb-json]').each(function() { magicJsonBinding('data-ucesb-json', data) });
	magicJsonBinding($('[data-ucesb-json]'), 'data-ucesb-json', data, data);

	$('[data-ucesb-foreach]').each(function() {
		var attr = $(this).attr('data-ucesb-foreach');
		var value = jsonFromPath(data, attr);
		$(this).parent().children("[data-generated]").remove();
		if (!value) return;
		for (var each of value) {
			var tp = $(this).clone();
			tp.removeAttr("hidden");
			tp.removeAttr("data-ucesb-foreach");
			tp.attr('data-generated', 'yes');
			magicJsonBinding($('[data-ucesb-row]', tp), 'data-ucesb-row', each, data);
			$(this).parent().append(tp);
		}
	});
}

function timeDifference(current, previous) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
         return Math.round(elapsed/1000) + ' seconds';
    } else if (elapsed < msPerHour) {
         return Math.round(elapsed/msPerMinute) + ' minutes';
    } else if (elapsed < msPerDay ) {
         return Math.round(elapsed/msPerHour ) + ' hours';
    } else if (elapsed < msPerMonth) {
         return Math.round(elapsed/msPerDay) + ' days';
    } else if (elapsed < msPerYear) {
         return Math.round(elapsed/msPerMonth) + ' months';
    } else {
         return Math.round(elapsed/msPerYear ) + ' years';
    }
}

function connect() {
	//const socket = new WebSocket("ws://localhost:9001");
	const socket = new WebSocket("wss://" + window.location.hostname + "/ucesb/ws");
	//const socket = new WebSocket("wss://despec-vm-01.gsi.de/ucesb/ws");
	var socketTimeout = null;

	socket.onopen = function (event) {
		$('.ws-disconnected').hide();
		$('.ws-connected').show();
		socketTimeout = setInterval(function() {
			socket.send("ping");
		}, 5000);
	}

	socket.onmessage = function (event) {
		if (event.data == "pong") return;

		var data = JSON.parse(event.data);

		if (data.message == "stat") {
			$(".ucesb-to").hide();
			$(".ucesb-dead").hide();
			$(".ucesb-stopped").hide();
			$(".ucesb-init").hide();
			$(".ucesb-info").show();
			updateFromJson(data.data);
		}
		else if (data.message == "init") {
			$(".ucesb-info").hide();
			$(".ucesb-to").hide();
			$(".ucesb-dead").hide();
			$(".ucesb-stopped").hide();
			$(".ucesb-init").show();
			updateFromJson(data.data);
		}
		else if (data.message == "exit") {
			$(".ucesb-info").hide();
			$(".ucesb-to").hide();
			$(".ucesb-dead").hide();
			$(".ucesb-init").hide();
			$(".ucesb-stopped").show();
		}
		else if (data.message == "timeout") {
			$(".ucesb-info").hide();
			$(".ucesb-dead").hide();
			$(".ucesb-stopped").hide();
			$(".ucesb-init").hide();
			$(".ucesb-to").show();
		}
		else if (data.message == "dead") {
			$(".ucesb-info").hide();
			$(".ucesb-to").hide();
			$(".ucesb-stopped").hide();
			$(".ucesb-init").hide();
			$(".ucesb-dead").show();
			updateFromJson(data.data);

			let last_update = new Date((data.data.summary.time - 37) * 1000);
			$("#ucesb-dead-time").text(timeDifference(new Date(), last_update));
		}
	}

	socket.onclose = function (event) {
		if (socketTimeout != null) {
			clearInterval(socketTimeout);
			socketTimeout = null;
		}
		$('.ws-connected').hide();
		$('.ws-disconnected').show();
		setTimeout(function() {
			connect();
		}, 2000);
	}
}

connect();

$(function() {

  var fatima_template = $("#fatima-scaler-template");

  for (var i = 0; i < fatima_scalers.length; i += 2)
  {
    var new_row = $(fatima_template.children()[0]).clone();

    new_row.append($(new_row.children()[0]).clone());

    for (var j = 0; j < 2; j++) {
      var col = new_row.children()[j];
	  if (fatima_scalers[i + j][0] == null) {
		  $(col).find(".col-6").html("&nbsp;");
		  $(col).find(".col-3.per-sec").html("&nbsp;");
		  $(col).find(".col-3.per-sec").attr("data-ucesb-default", null);
		  $(col).find(".col-3.per-sec").attr("data-ucesb-filter", null);
		  $(col).find(".col-3.per-sec").attr("data-ucesb-json", null);
		  $(col).find(".col-3.per-spill").html("&nbsp;");
		  $(col).find(".col-3.per-spill").attr("data-ucesb-default", null);
		  $(col).find(".col-3.per-spill").attr("data-ucesb-filter", null);
		  $(col).find(".col-3.per-spill").attr("data-ucesb-json", null);
	  }
	  else {
	    $(col).find(".col-6").text(fatima_scalers[i + j][0]);
		$(col).find(".col-3.per-sec").attr("data-ucesb-json", "scalers.fatima." + fatima_scalers[i + j][1] + ".rate");
		$(col).find(".col-3.per-spill").attr("data-ucesb-json", "scalers.fatima." + fatima_scalers[i + j][1] + ".spill");
	  }
    }

    fatima_template.parent().append(new_row);
  }

  fatima_template.remove();

  var frs_template = $("#frs-scaler-template");

  for (var i = 0; i < frs_scalers.length; i += 2)
  {
    var new_row = $(frs_template.children()[0]).clone();

    new_row.append($(new_row.children()[0]).clone());

    for (var j = 0; j < 2; j++) {
      var col = new_row.children()[j];
      $(col).find(".col-6").text(frs_scalers[i + j][0]);
      $(col).find(".col-3.per-sec").attr("data-ucesb-json", "scalers.frs." + frs_scalers[i + j][1] + ".rate");
	  $(col).find(".col-3.per-spill").attr("data-ucesb-json", "scalers.frs." + frs_scalers[i + j][1] + ".spill");
      if (frs_scalers[i + j][0] == "SEETRAM") {
            //$(col).find(".col-3.per-sec").attr("data-ucesb-filter", "seetram");
            $(col).find(".col-3.per-spill").attr("data-ucesb-filter", "seetram");
      }
    }

    frs_template.parent().append(new_row);
  }

  frs_template.remove();

  $("#option1").trigger("click");

}
);

$("#option1").click(function() {
	$(".per-spill").hide();
	$(".per-sec").show();
});

$("#option2").click(function() {
	$(".per-sec").hide();
	$(".per-spill").show();
});

function seetram_sd_ey(ain, zin, ein) {
    var array_EHPAR = [-0.668659E-04, -0.185311E-05, 0.873192E-07, -0.690141E-09,
                -0.530758E+00,  0.898953E-02, 0.268916E+01, -0.533772E-02,
                -0.214131E+00,  0.773008E-03, 1.0E0];
      // var eProEV = 41.1718 - (1.0908 + (1.83165E-2 - 1.07085E-4 * zin) * zin) * zin;
        var eProEV = 41.1718 - 1.0908*zin + 1.83165E-2 *zin*zin - 1.07085E-4 *zin*zin*zin;
        var corrFactor = 1.0;//
        if (ein > 1500.0){
             corrFactor = 1.08;
        }else if(ein < 300.0){
             corrFactor = 1.19;
        }else{
            corrFactor = 1.248 - 0.2396E-3 * ein + 0.85470E-7 * ein * ein;
        }
        var logein = Math.log10(ein);
        var energy = array_EHPAR[10] * (ain/zin/zin) * Math.pow(10.0,
                    ((1.E0 + array_EHPAR[0]*zin + array_EHPAR[1]*zin*zin + array_EHPAR[2]*zin*zin*zin + array_EHPAR[3]*zin*zin*zin*zin) *
                    (array_EHPAR[4] + array_EHPAR[5]*zin +    (array_EHPAR[6] + array_EHPAR[7]*zin) * logein +
                    (array_EHPAR[8] + array_EHPAR[9]*zin) * logein*logein)));
        energy  = energy - 1.0;
        var aaa = (array_EHPAR[6] + array_EHPAR[7] * zin) / (2.0 * (array_EHPAR[8] + array_EHPAR[9] * zin));
        energy = Math.pow(10.0, -aaa -Math.sqrt(aaa*aaa  -(array_EHPAR[4]+array_EHPAR[5]*zin) /  (array_EHPAR[8]+array_EHPAR[9]*zin) + Math.log10(energy/array_EHPAR[10] * zin*zin/ain) /
                          ( (1.0 + array_EHPAR[0]*zin + array_EHPAR[1]*zin*zin + array_EHPAR[2]*zin*zin*zin + array_EHPAR[3]*zin*zin*zin*zin)
                          * (array_EHPAR[8]+array_EHPAR[9]*zin) )));
        var de = ain * (ein - energy);
        var yield = de * eProEV / corrFactor;
        return yield;
}

function seetram_correct(ey, range) {
    var a_per_ion = ey * 1.60217662E-19;
    var pulses_per_ion = a_per_ion * (10000. / range);
    return (1. / pulses_per_ion);
}

function seetram_cal(raw) {
    // 1 pA = 1.0E-12
    // 10 pA = 1.0E-11
    // 100 pA = 1.0E-10
    // 1nA = 1.0E-9
    // 10nA = 1.0E-8

	if (!last_msg.scalers) return 0;

    raw -= last_msg.scalers.frs[SEETRAM_C].spill * SEETRAM_0;

    var seetram_yield = seetram_sd_ey(SEETRAM_A, SEETRAM_Z, SEETRAM_E);
    var seetram_yield = seetram_correct(seetram_yield, SEETRAM_R);

    return raw * seetram_yield;
}
