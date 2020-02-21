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
	    "<p>If you reject the offer, then nobody gets any money after all.</p><br>" +
	    "<p><b>As a bonus, you will receive the amount of money that you earn from a randomly selected round of the game.</b></p>",
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


/* test trials */
var accept_trial = {
    timeline: [{type: 'html-button-response',
		stimulus: function () {
		    return avatar() + "<p>You are now playing with " +
			jsPsych.timelineVariable('player', true) + ".</p><p>" +
			jsPsych.timelineVariable('player', true) + " has offered you $" +
			jsPsych.timelineVariable('offer', true) + " out of $" +
			stakes.toFixed(2) + ".</p>" +
			"<p>Do you accept this offer?</p><br>"
		},
		choices: ["Yes", "No"],
		button_html: LR_BUTTONS,
		on_start: ALLOW_KEYPRESS,
		on_finish: function (data) {
		    DISABLE_KEYPRESS();
		    data.player = jsPsych.timelineVariable('player', true);
		    data.offer = jsPsych.timelineVariable('offer', true);
		    data.accept = data.button_pressed == 0;
		    if (data.accept) {
			data.response = "accept";
			data.earned = jsPsych.timelineVariable('offer', true);
		    } else {
			data.response = "reject";
			data.earned = "0.00";
		    }
		}
	       },

	       {type: 'instructions',
		pages: function () {
		    d = jsPsych.data.getLastTrialData().values()[0];
		    return [avatar() + "<p>You have " + d.response + "ed " +
			    jsPsych.timelineVariable('player', true) + "'s offer of $" +
			    d.offer + " out of $" + stakes.toFixed(2) + ".<p>" +
			    "As a result, you have earned $" +
			    jsPsych.data.getLastTrialData().values()[0].earned + ".</p>"
			   ]},
		show_clickable_nav: true,
		allow_backward: false},
	       
	       {type: 'html-slider-response',
		stimulus: function () {
		    d = jsPsych.data.get().last(2).first(1).values()[0];
		    return avatar() + "<p>To what extent did " + d.player +
			" making an offer of $" + d.offer +
			" cause you to earn $" + d.earned + "?</p><br>"
		},
		labels: ["not at all", "totally"]
	       },

	       {type: 'html-slider-response',
		stimulus: function () {
		    return avatar() + "<p>How confident are you in your response to the previous question?</p><br>"
		},
		labels: ["not at all", "totally"]
	       }
	      ],
    timeline_variables: trialParams,
    randomize_order: true,
    data: {stage: 1}
};
accept_timeline.push(accept_trial);


/* Instructions for MCMC section */
var instructions_mcmc_accept = {
    type: 'instructions',
    pages: ["<p>Great work!</p><br><p>Now, we want to learn what you think of the different players in this game.</p>",
	    "<p>To do so, we will first tell you which partner you are playing with.</p>" +
	    "<p>Then you'll be shown two possible offers, and you will be asked:</p><br><p>\"Which offer is more likely?\"</p><br>" +
	    "<p>Please choose the offer amount that your partner is most likely to have offered.</p>"],
    show_clickable_nav: true
};
if (!TEST) accept_timeline.push(instructions_mcmc_accept);

/* MCMC trials */
var trials_mcmc_accept = {
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
		choices[0] = lastTrial.choice;
		choices[1] = "$" + Math.random().toFixed(2);
		choices = jsPsych.randomization.shuffle(choices);
	    }
	    return choices;
	},
	button_html: LR_BUTTONS,
	on_start: ALLOW_KEYPRESS,
	on_finish: function(data) {
	    DISABLE_KEYPRESS();
	    data.choices = jsPsych.currentTrial().choices;
	    data.choice = data.choices[data.button_pressed];
	    data.player = jsPsych.timelineVariable('player', true);
	    data.chain = jsPsych.timelineVariable('chain', true);
	}
    }],
    timeline_variables: mcmcParams,
    repetitions: mcmcTrials,
    randomize_order: true
};
accept_timeline.push(trials_mcmc_accept)
