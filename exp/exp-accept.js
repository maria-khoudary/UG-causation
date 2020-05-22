/* create timeline */
var accept_timeline = [];

/* Display instructions trials */
var instructions_accept = {
  type: 'instructions',
  pages: ["<p>Please pay attention and carefully read the following instructions.</p><p>In this HIT, you are going to play a game. " +
    "There are two players: you, and a partner. In every round of this game, you and your partner receive " + stakes_txt + " ($" + stakes.toFixed(2) +
    "), and you must decide how to split it between the two of you.</p><br><p>Here's how it works:</p>",
    "<p>First, your partner will offer you some portion of the money.</p><p>They can offer you any amount between $0.00 and $" + stakes.toFixed(2) + ".</p>",
    "<p>Once your partner makes an offer, you may either accept or reject this offer.</p>" +
    "<p>If you accept the offer, then you will receive the amount of money offered to you, and your partner will get the rest.</p>" +
    "<p>If you reject the offer, then nobody gets any money in that round after all.</p><br>" +
    "<p><b>As a bonus, you will receive the amount of money that you earn from a randomly selected round of the game.</b></p>",
    "<p>In addition to clicking on the buttons, you may use the left and right arrow keys to make responses.</p>",
    "<img src='img/red_player.png' height='" + stim_size + "'>" +
    "<img src='img/yellow_player.png' height='" + stim_size + "'>" +
    "<img src='img/blue_player.png' height='" + stim_size + "'>" +
    "<p>One more thing about this game: in each round of the game, " +
    "you will play with one of three partners: Red, Yellow, or Blue. " +
    "Before each round, you will be told which partner you are playing with.</p>"],
  show_clickable_nav: true
};
if (!TEST) accept_timeline.push(instructions_accept);

/* Display check questions and loop until correct */
var check_choices = ["You get the amount of money specified in the offer, but your partner gets nothing.",
                     "Neither player recieves any money",
                     "Your partner gets the amount of money specified in the offer, and you get the rest.",
                     "You get the amount of money specified in the offer, and your partner gets the rest."];
if (!TEST)
  accept_timeline.push(check_q("check1", "Check question: what happens when you accept an offer?", check_choices, 3),
		                   check_q("check2", "Check question: what happens when you reject an offer?", check_choices, 1));

// Ask for a causal judgment after the player accepts/rejects
var accept_cause = {
  type: 'html-slider-response',
  stimulus: function () {
    d = jsPsych.data.getLastTrialData().values()[0];
    return avatar() + "<p>You have " + d.response + "ed " +
      d.player + "'s offer of $" + d.offer +
      " out of $" + stakes.toFixed(2) + ".<p>" +
      "As a result, you have earned $" + d.earned + ".</p><br>" +
      "<p><b>To what extent did " + d.player +
      " making an offer of $" + d.offer +
      " cause you to earn $" + d.earned + " in this round?</b></p><br>"
  },
  labels: ["not at all", "totally"],
  trial_duration: TRIAL_DURATION,
  on_finish: function (data) {
    d = jsPsych.data.getLastTrialData().values()[0];
    data.stage = 1;
    data.player = jsPsych.timelineVariable('player', true);
    data.trait = jsPsych.timelineVariable('trait', true);
    data.alpha = jsPsych.timelineVariable('alpha', true);
    data.beta = jsPsych.timelineVariable('beta', true);
    data.offer = jsPsych.timelineVariable('offer', true);
    data.prob = jStat.beta.pdf(data.offer / stakes,
                               jsPsych.timelineVariable('alpha', true),
                               jsPsych.timelineVariable('beta', true));
    data.measure = "cause";
  }
};
var accept_confidence = {
  type: 'html-slider-response',
  stimulus: function () {
    d = jsPsych.data.get().last(2).first(1).values()[0];
    d2 = jsPsych.data.getLastTrialData().values()[0];
    return avatar() + "<p>You have " + d.response + "ed " +
      d.player + "'s offer of $" + d.offer +
      " out of $" + stakes.toFixed(2) + ".<p>" +
      "As a result, you have earned $" + d.earned + ".</p><br>" +
      "<p>To what extent did " + d.player +
      " making an offer of $" + d.offer +
      " cause you to earn $" + d.earned + " in this round?</p><br>" +
      '<div class="jspsych-image-slider-response-container" style="position:relative; margin: 0 auto 3em auto;">' +
      "<input type='range' disabled='true' style='width: 100%' value='" + d2.response + "'>" +
      '<div><div style="display: inline-block; position: absolute; left:-50%; text-align: center; width: 100%;">' +
      '<span style="text-align: center; font-size: 80%;">not at all</span></div>' +
      '<div style="display: inline-block; position: absolute; left:50%; text-align: center; width: 100%;">' +
      '<span style="text-align: center; font-size: 80%;">totally</span></div></div></div><br><br>' +
      "<p><b>How confident are you in your response to the previous question?</b></p>"
  },
  labels: ["not at all", "totally"],
  trial_duration: TRIAL_DURATION,
  post_trial_gap: POST_TRIAL_GAP,
  on_finish: function (data) {
    data.stage = 1;
    data.player = jsPsych.timelineVariable('player', true);
    data.trait = jsPsych.timelineVariable('trait', true);
    data.alpha = jsPsych.timelineVariable('alpha', true);
    data.beta = jsPsych.timelineVariable('beta', true);
    data.offer = jsPsych.timelineVariable('offer', true);
    data.prob = jStat.beta.pdf(data.offer / stakes,
                               jsPsych.timelineVariable('alpha', true),
                               jsPsych.timelineVariable('beta', true));
    data.measure = "confidence";
  }
};

var accept_feedback = {
  type: 'instructions',
  trial_duration: TRIAL_DURATION,
  show_clickable_nav: true,
  post_trial_gap: POST_TRIAL_GAP,
  pages: function () {
    d = jsPsych.data.getLastTrialData().values()[0];
    return [avatar() + "<p>You have " + d.response + "ed " +
            d.player + "'s offer of $" + d.offer +
            " out of $" + stakes.toFixed(2) + ".<p>" +
            "As a result, you have earned $" + d.earned + ".</p><br>"];
  }
};

/* test trials */
var accept_trial = {
  timeline_variables: trialParams,
  randomize_order: true,
  timeline: [{
    type: 'html-button-response',
    stimulus: function () {
      return avatar() + "<p>You are now playing with " +
        jsPsych.timelineVariable('player', true) + ".</p><p>" +
        jsPsych.timelineVariable('player', true) + " has offered you $" +
        jsPsych.timelineVariable('offer', true) + " out of $" +
        stakes.toFixed(2) + ".</p>" +
        "<p>Do you accept this offer?</p><br>"
    },
    choices: ["Yes", "No"],
    trial_duration: TRIAL_DURATION,
    button_html: LR_BUTTONS,
    on_start: ALLOW_KEYPRESS,
    on_finish: function (data) {
      console.log('Finished');
      DISABLE_KEYPRESS();
      data.stage = 1;
      data.measure = "UG";
      data.player = jsPsych.timelineVariable('player', true);
      data.trait = jsPsych.timelineVariable('trait', true);
      data.alpha = jsPsych.timelineVariable('alpha', true);
      data.beta = jsPsych.timelineVariable('beta', true);
      data.offer = jsPsych.timelineVariable('offer', true);
      data.prob = jStat.beta.pdf(data.offer / stakes,
                                 jsPsych.timelineVariable('alpha', true),
                                 jsPsych.timelineVariable('beta', true));
      data.accept = data.button_pressed == 0;
      if (data.accept) {
        data.response = "accept";
        data.earned = jsPsych.timelineVariable('offer', true);
      } else {
        data.response = "reject";
        data.earned = "0.00";
      }
    }
  }, accept_feedback]
};
if (trials > 0) accept_timeline.push(accept_trial);


/* Instructions for MCMC section */
var instructions_mcmc_accept = {
  type: 'instructions',
  pages: ["<p>Great work!</p><br><p>Now, we want to learn what you think of the different players in this game.</p>",
          "<p>To do so, we will first tell you which partner you are playing with.</p>" +
          "<p>Then you'll be shown two possible offers, and you will be asked:</p><br><p>\"Which offer is more likely?\"</p><br>" +
          "<p><b>Please choose the offer amount that your partner is most likely to have offered.<b></p>"],
  show_clickable_nav: true
};
if (!TEST) accept_timeline.push(instructions_mcmc_accept);

/* MCMC trials */
var trials_mcmc_accept = {
  timeline_variables: mcmcParams,
  repetitions: mcmcTrials,
  randomize_order: true,
  data: {stage: 2, measure: "mcmc"},
  timeline: [{
    type: 'html-button-response',
    stimulus: function () {
      return avatar() + "<p>Which offer is " +
        jsPsych.timelineVariable('player', true) +
        " more likely to make?</p>"
    },
    choices: function () {
      let choices = jsPsych.timelineVariable('choices', true);
      lastTrial = jsPsych.data.get().filter({
        player: jsPsych.timelineVariable('player', true),
        chain: jsPsych.timelineVariable('chain', true)
      }).last(1).values()[0];

      // Use one of the choices from the last trial in this chain,
      // and shuffle the choices into a random order
      if (lastTrial != undefined) {
        choices[0] = lastTrial.response;
        choices[1] = "$" + sampleOffer(choices[0]).toFixed(2);
        while (choices[1] == choices[0]) {
          choices[1] = "$" + sampleOffer(choices[0]).toFixed(2);
        }
        choices = jsPsych.randomization.shuffle(choices);
      }
      return choices;
    },
    trial_duration: TRIAL_DURATION,
    post_trial_gap: POST_TRIAL_GAP,
    button_html: LR_BUTTONS,
    on_start: ALLOW_KEYPRESS,
    on_finish: function(data) {
      DISABLE_KEYPRESS();
      data.choices = jsPsych.currentTrial().choices;
      data.response = data.choices[data.button_pressed];
      data.player = jsPsych.timelineVariable('player', true);
      data.trait = jsPsych.timelineVariable('trait', true);
      data.alpha = jsPsych.timelineVariable('alpha', true);
      data.beta = jsPsych.timelineVariable('beta', true);
      data.chain = jsPsych.timelineVariable('chain', true);
    }
  }]
};
accept_timeline.push(trials_mcmc_accept)
