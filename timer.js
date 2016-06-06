'use strict';

const FPS = 59.8261;
const TICK_MS = 10;
const MINIMUM_TIME_MS = 14000;
const ONE_MINUTE_MS = 60000;

const gen5CalibrationInput = document.getElementById('gen-5-calibration-input');
const gen5TargetSecondsInput = document.getElementById('gen-5-target-seconds-input');
const gen5SecondHitInput = document.getElementById('gen-5-second-hit-input');
const gen5StartButton = document.getElementById('gen-5-start-button');
const gen5TimeRemaining = document.getElementById('gen-5-time-remaining');
const gen5MinutesBefore = document.getElementById('gen-5-minutes-before');

const gen4CalibratedDelayInput = document.getElementById('gen-4-calibrated-delay-input');
const gen4CalibratedSecondsInput = document.getElementById('gen-4-calibrated-seconds-input');
const gen4TargetDelayInput = document.getElementById('gen-4-target-delay-input');
const gen4TargetSecondsInput = document.getElementById('gen-4-target-seconds-input');
const gen4DelayHitInput = document.getElementById('gen-4-delay-hit-input');
const gen4StartButton = document.getElementById('gen-4-start-button');
const gen4TimeRemaining1 = document.getElementById('gen-4-time-remaining-1');
const gen4TimeRemaining2 = document.getElementById('gen-4-time-remaining-2');
const gen4MinutesBefore = document.getElementById('gen-4-minutes-before');

const countdownCheckbox = document.getElementById('countdown-checkbox');
const soundTypeDropdown = document.getElementById('sound-type-dropdown');
const numSoundsInput = document.getElementById('num-sounds-input');
const soundsIntervalInput = document.getElementById('sounds-interval-input');

const audios = {
  tick: new Audio('tick.wav'),
  beep: new Audio('beep.wav'),
  pop: new Audio('pop.wav'),
  ding: new Audio('ding.wav')
};

function zeroPadNum (num, length) {
  const str = num + '';
  return str.length >= length ? str : ('0'.repeat(length) + str).slice(-length);
}

function getFormattedTime (ms) {
  return zeroPadNum(Math.floor(ms / 1000), 2) + ':' + zeroPadNum(Math.floor(ms % 1000 / TICK_MS), 2);
}

const noop = () => {};

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
        for (let i = 0; i < numSoundsInput.value; i++) {
          this._audioTimers.push(setTimeout(() => {
            audios[soundTypeDropdown.value].play();
          }, this._totalTime - i * soundsIntervalInput.value));
        }
      }
      this._intervalTimer = setInterval(() => this._tick(), TICK_MS);
      this._stopTimer = setTimeout(() => this.stop(), this._totalTime);
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

const gen5Timer = new Timer({
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

const initialGen4Times = calculateGen4Times();
let gen4MinutesBeforeVal = Math.floor((initialGen4Times[0] + initialGen4Times[1]) / ONE_MINUTE_MS);
gen4MinutesBefore.innerHTML = gen4MinutesBeforeVal;

const gen4Timer1 = new Timer({
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

const gen4Timer2 = new Timer({
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
  let time = getGen5Time(+gen5CalibrationInput.value, +gen5TargetSecondsInput.value);
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
  const targetSec = +gen5TargetSecondsInput.value;
  const secondHit = +gen5SecondHitInput.value;
  if (Number.isFinite(targetSec) && Number.isFinite(secondHit)) {
    gen5CalibrationInput.value = +gen5CalibrationInput.value + getGen5CalibrationOffset(targetSec, secondHit);
    updateGen5TotalTime();
  }
}

function calculateGen4Times () {
  const targetSec = +gen4TargetSecondsInput.value;
  const targetDelay = +gen4TargetDelayInput.value;
  const calibratedDelay = +gen4CalibratedDelayInput.value;
  const calibratedSeconds = +gen4CalibratedSecondsInput.value;
  const secondTimeMs = toMs(targetDelay * 1000 - calibratedDelay * 1000) + calibratedSeconds * 1000;
  let firstTimeMs = ((targetSec * 1000 - secondTimeMs) % ONE_MINUTE_MS + ONE_MINUTE_MS) % ONE_MINUTE_MS + 200;
  if (firstTimeMs < MINIMUM_TIME_MS) {
    firstTimeMs += ONE_MINUTE_MS;
  }
  return [firstTimeMs, secondTimeMs];
}

// eslint-disable-next-line
function updateGen4Times () {
  const totalTimes = calculateGen4Times();
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
  const targetDelay = +gen4TargetDelayInput.value;
  const delayHit = +gen4DelayHitInput.value;
  if (Number.isFinite(targetDelay) && Number.isFinite(delayHit)) {
    gen4CalibratedDelayInput.value = +gen4CalibratedDelayInput.value + Math.round((delayHit - targetDelay) / 2)
  }
  updateGen4Times();
}

// eslint-disable-next-line
function updateCountdownOptions () {
  const isDisabled = !countdownCheckbox.checked;
  soundTypeDropdown.disabled = isDisabled;
  numSoundsInput.disabled = isDisabled;
  soundsIntervalInput.disabled = isDisabled;
}
