'use strict';

var FPS = 59.8261;
var TICK_MS = 10;
var MINIMUM_TIME_MS = 14000;
var ONE_MINUTE_MS = 60000;

var gen5CalibrationInput = document.getElementById('gen-5-calibration-input');
var gen5TargetSecondsInput = document.getElementById('gen-5-target-seconds-input');
var gen5SecondHitInput = document.getElementById('gen-5-second-hit-input');
var gen5StartButton = document.getElementById('gen-5-start-button');
var gen5TimeRemaining = document.getElementById('gen-5-time-remaining');
var gen5MinutesBefore = document.getElementById('gen-5-minutes-before');

var gen4CalibratedDelayInput = document.getElementById('gen-4-calibrated-delay-input');
var gen4CalibratedSecondsInput = document.getElementById('gen-4-calibrated-seconds-input');
var gen4TargetDelayInput = document.getElementById('gen-4-target-delay-input');
var gen4TargetSecondsInput = document.getElementById('gen-4-target-seconds-input');
var gen4DelayHitInput = document.getElementById('gen-4-delay-hit-input');
var gen4StartButton = document.getElementById('gen-4-start-button');
var gen4TimeRemaining1 = document.getElementById('gen-4-time-remaining-1');
var gen4TimeRemaining2 = document.getElementById('gen-4-time-remaining-2');
var gen4MinutesBefore = document.getElementById('gen-4-minutes-before');

var countdownCheckbox = document.getElementById('countdown-checkbox');
var soundTypeDropdown = document.getElementById('sound-type-dropdown');
var numSoundsInput = document.getElementById('num-sounds-input');
var soundsIntervalInput = document.getElementById('sounds-interval-input');

var audios = {
  tick: new Audio('tick.wav'),
  beep: new Audio('beep.wav'),
  pop: new Audio('pop.wav'),
  ding: new Audio('ding.wav')
};

function zeroPadNum (num, length) {
  var str = num + '';
  return str.length >= length ? str : ('0'.repeat(length) + str).slice(-length);
}

function getFormattedTime (ms) {
  return zeroPadNum(Math.floor(ms / 1000), 2) + ':' + zeroPadNum(Math.floor(ms % 1000 / TICK_MS), 2);
}

var noop = function () {};

class Timer {
  constructor (opts) {
    this.onStart = opts.onStart || noop;
    this.onStop = opts.onStop || noop;
    this.onChange = opts.onChange || noop;
    this._totalTime = opts.totalTime || null;
    this._intervalTimer = null;
    this._timeRemaining = this._totalTime;
  }
  isActive () {
    return this._intervalTimer !== null;
  }
  toggle () {
    if (this.isActive()) {
      this.stop();
    } else {
      this.start();
    }
  }
  start () {
    if (!this.isActive()) {
      this._stopPoint = Date.now() + this._totalTime;
      this._audioTimers = [];
      if (countdownCheckbox.checked) {
        for (var i = 0; i < numSoundsInput.value; i++) {
          this._audioTimers.push(setTimeout(function () {
            audios[soundTypeDropdown.value].play();
          }, this._totalTime - i * soundsIntervalInput.value));
        }
      }
      this._intervalTimer = setInterval(this._tick.bind(this), TICK_MS);
      this._stopTimer = setTimeout(this.stop.bind(this), this._totalTime);
      this.onStart();
      this.onChange();
    }
  }
  stop () {
    if (this.isActive()) {
      this._audioTimers.forEach(clearTimeout);
      this._audioTimers = [];
      clearInterval(this._intervalTimer);
      clearTimeout(this._stopTimer);
      this._intervalTimer = null;
      this._timeRemaining = this._totalTime;
      this.onStop();
      this.onChange();
    }
  }
  getTimeRemaining () {
    return this._timeRemaining;
  }
  getTotalTime () {
    return this._totalTime;
  }
  setTotalTime (ms) {
    this._totalTime = ms;
    if (!this.isActive()) {
      this._timeRemaining = ms;
    }
    this.onChange();
  }
  _tick () {
    if (this._intervalTimer) {
      this._timeRemaining = this._stopPoint - Date.now();
      this.onChange();
    }
  }
}

var gen5Timer = new Timer({
  onStart () {
    gen5StartButton.innerHTML = 'Stop';
  },
  onStop () {
    gen5StartButton.innerHTML = 'Start';
    gen5MinutesBefore.innerHTML = Math.floor(this.getTotalTime() / ONE_MINUTE_MS);
  },
  onChange () {
    gen5TimeRemaining.innerHTML = getFormattedTime(this.getTimeRemaining());
  },
  totalTime: calculateGen5TotalTime()
});

gen5Timer.onChange();

var initialGen4Times = calculateGen4Times();
var gen4MinutesBeforeVal = Math.floor((initialGen4Times[0] + initialGen4Times[1]) / ONE_MINUTE_MS);
gen4MinutesBefore.innerHTML = gen4MinutesBeforeVal;

var gen4Timer1 = new Timer({
  onStart () {
    gen4StartButton.innerHTML = 'Stop';
  },
  onStop () {
    gen4Timer2.start();
  },
  onChange () {
    if (!gen4Timer2.isActive()) {
      gen4TimeRemaining1.innerHTML = getFormattedTime(this.getTimeRemaining());
      if (!this.isActive()) {
        gen4MinutesBefore.innerHTML = gen4MinutesBeforeVal;
      }
    }
  },
  totalTime: initialGen4Times[0]
});

var gen4Timer2 = new Timer({
  onStart () {
    gen4TimeRemaining1.innerHTML = getFormattedTime(this.getTotalTime());
    gen4TimeRemaining2.innerHTML = getFormattedTime(0);
  },
  onStop () {
    gen4StartButton.innerHTML = 'Start';
    gen4MinutesBefore.innerHTML = gen4MinutesBeforeVal;
    gen4TimeRemaining1.innerHTML = getFormattedTime(gen4Timer1.getTotalTime());
    gen4TimeRemaining2.innerHTML = getFormattedTime(this.getTotalTime());
  },
  onChange () {
    if (this.isActive()) {
      gen4TimeRemaining1.innerHTML = getFormattedTime(this.getTimeRemaining());
    }
  },
  totalTime: initialGen4Times[1]
});

gen4Timer1.onChange();
gen4TimeRemaining2.innerHTML = getFormattedTime(gen4Timer2.getTotalTime());

// eslint-disable-next-line
function toggleGen4Timers () {
  if (gen4Timer1.isActive() || gen4Timer2.isActive()) {
    gen4Timer1.stop();
    gen4Timer2.stop();
  } else {
    gen4Timer1.start();
  }
}

function toDelay (delay) {
  return Math.round(delay * FPS);
}

function toMs (ms) {
  return Math.round(ms / FPS);
}

function getGen5Time (calibration, targetSec) {
  return 1000 * (targetSec + toMs(calibration)) + 200;
}

function getGen5CalibrationOffset (targetSec, result) {
  return toDelay(targetSec === result ? 0 : targetSec - result + (result > targetSec ? 0.5 : -0.5));
}

function calculateGen5TotalTime () {
  var time = getGen5Time(+gen5CalibrationInput.value, +gen5TargetSecondsInput.value);
  if (time < MINIMUM_TIME_MS) {
    time += ONE_MINUTE_MS;
  }
  return time;
}

function updateGen5TotalTime () {
  gen5Timer.setTotalTime(calculateGen5TotalTime());
  if (!gen5Timer.isActive()) {
    gen5MinutesBefore.innerHTML = Math.floor(gen5Timer.getTotalTime() / ONE_MINUTE_MS);
  }
}

// eslint-disable-next-line
function updateGen5Calibration () {
  var targetSec = +gen5TargetSecondsInput.value;
  var secondHit = +gen5SecondHitInput.value;
  if (Number.isFinite(targetSec) && Number.isFinite(secondHit)) {
    gen5CalibrationInput.value = +gen5CalibrationInput.value + getGen5CalibrationOffset(targetSec, secondHit);
    updateGen5TotalTime();
  }
}

function calculateGen4Times () {
  var targetSec = +gen4TargetSecondsInput.value;
  var targetDelay = +gen4TargetDelayInput.value;
  var calibratedDelay = +gen4CalibratedDelayInput.value;
  var calibratedSeconds = +gen4CalibratedSecondsInput.value;
  var secondTimeMs = toMs(targetDelay * 1000 - calibratedDelay * 1000) + calibratedSeconds * 1000;
  var firstTimeMs = ((targetSec * 1000 - secondTimeMs) % ONE_MINUTE_MS + ONE_MINUTE_MS) % ONE_MINUTE_MS + 200;
  if (firstTimeMs < MINIMUM_TIME_MS) {
    firstTimeMs += ONE_MINUTE_MS;
  }
  return [firstTimeMs, secondTimeMs];
}

// eslint-disable-next-line
function updateGen4Times () {
  var totalTimes = calculateGen4Times();
  gen4Timer1.setTotalTime(totalTimes[0]);
  gen4Timer2.setTotalTime(totalTimes[1]);
  gen4MinutesBeforeVal = Math.floor((totalTimes[0] + totalTimes[1]) / ONE_MINUTE_MS);
  if (!gen4Timer1.isActive() && !gen4Timer2.isActive()) {
    gen4TimeRemaining2.innerHTML = getFormattedTime(gen4Timer2.getTotalTime());
    gen4MinutesBefore.innerHTML = gen4MinutesBeforeVal;
  }
}

// eslint-disable-next-line
function updateGen4Calibration () {
  var targetDelay = +gen4TargetDelayInput.value;
  var delayHit = +gen4DelayHitInput.value;
  if (Number.isFinite(targetDelay) && Number.isFinite(delayHit)) {
    gen4CalibratedDelayInput.value = +gen4CalibratedDelayInput.value + Math.round((delayHit - targetDelay) / 2)
  }
  updateGen4Times();
}

// eslint-disable-next-line
function updateCountdownOptions () {
  var isDisabled = !countdownCheckbox.checked;
  soundTypeDropdown.disabled = isDisabled;
  numSoundsInput.disabled = isDisabled;
  soundsIntervalInput.disabled = isDisabled;
}
