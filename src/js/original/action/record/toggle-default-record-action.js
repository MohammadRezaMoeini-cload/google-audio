/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
goog.provide('audioCat.action.record.ToggleDefaultRecordAction');

goog.require('audioCat.action.Action');


/**
 * Toggles default recording. Records if stopped. Stops if recording. Does
 * nothing if the manager is not ready to record.
 * @param {!audioCat.audio.record.MediaRecordManager} mediaRecordManager Manages
 *     recording of media.
 * @param {!audioCat.audio.play.PlayManager} playManager Manages the playing of
 *     audio.
 * @param {!audioCat.ui.message.MessageManager} messageManager Issues requests
 *     to display messages to the user.
 * @param {!audioCat.state.prefs.PrefManager} prefManager Manages user
 *     preferences.
 * @constructor
 * @extends {audioCat.action.Action}
 */
audioCat.action.record.ToggleDefaultRecordAction = function(
    mediaRecordManager,
    playManager,
    messageManager,
    prefManager,
    audioContextManager) {
  goog.base(this);
  /**
   * @private {!audioCat.audio.record.MediaRecordManager}
   */
  this.mediaRecordManager_ = mediaRecordManager;

  /**
   * @private {!audioCat.audio.play.PlayManager}
   */
  this.playManager_ = playManager;

  /**
   * @private {!audioCat.ui.message.MessageManager}
   */
  this.messageManager_ = messageManager;

  /**
   * @private {!audioCat.state.prefs.PrefManager}
   */
  this.prefManager_ = prefManager;

    /**
   * Manages the audio context so it can be resumed when the user clicks the
   * record button.
   * @private {!audioCat.audio.AudioContextManager}
   */
  this.audioContextManager_ = audioContextManager;

  /**
   * The current recording job. Null if not recording.
   * @private {audioCat.audio.record.RecordingJob}
   */
  this.recordingJob_ = null;
};
goog.inherits(
    audioCat.action.record.ToggleDefaultRecordAction, audioCat.action.Action);

/** @override */
audioCat.action.record.ToggleDefaultRecordAction.prototype.doAction =
    function() {
  var mediaRecordManager = this.mediaRecordManager_;
  var playManager = this.playManager_;
  var prefManager = this.prefManager_;
  // Resuming the audio context here ensures Chrome allows sound playback as
  // part of the user's click on the record button.
  this.audioContextManager_.resume();
  if (mediaRecordManager.getDefaultRecordingReadyState()) {
    // Only record if we're ready to do so.
    if (this.recordingJob_) {
      // Stop the current recording.
      this.recordingJob_.stop();
      this.recordingJob_ = null;
      this.messageManager_.issueMessage('Recording ended.');
    } else {
       // Begin recording after a short countdown. Start playing only after the
      // countdown so the play time does not advance prematurely.
      var startRecording = goog.bind(function() {
        if (prefManager.getPlaceNewRecordingAtBeginning()) {
          playManager.setTime(0);
        }
        var sectionBeginTime = prefManager.getPlaceNewRecordingAtBeginning() ?
            0: playManager.getTime();
        this.recordingJob_ = mediaRecordManager.createDefaultRecordingJob(
            prefManager.getChannelsForRecording(), sectionBeginTime);
        this.recordingJob_.start();
        this.messageManager_.issueMessage('Now recording.');
        if (prefManager.getPlayWhileRecording()) {
          if (!playManager.getPlayState()) {
            playManager.play();
          }
          playManager.listenOnce(audioCat.audio.play.events.PAUSED,
              function() {
                if (this.recordingJob_) {
                  // We are recording. Stop after the pause.
                  this.doAction();
                }
              }, false, this);
        }
   } , this);
        

       // Display a numeric countdown before starting to record. A short beep
      // plays after the countdown completes.
      var count = 3;
      var messageId = null;
      var countdown = goog.bind(function() {
        if (messageId != null) {
          this.messageManager_.hideMessage(messageId);
        }
        if (count > 0) {
          messageId = this.messageManager_.issueMessage(String(count));
          count--;
          goog.global.setTimeout(countdown, 1000);
        } else {
          this.audioContextManager_.playBeep();
          messageId = null;
          startRecording();
        }
      }, this);
      countdown();
    }
  }
};
