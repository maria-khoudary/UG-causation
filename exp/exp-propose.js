/* create timeline */
var propose_timeline = [];

/* Display instructions trials */
var instructions_propose = {
    type: 'instructions',
    pages: ["<p>Please pay attention and carefully read the following instructions.</p><p>In this HIT, you are going to play a game. " +
	    "There are two players: you, and a partner. In every round of this game, you and your partner receive " + stakes_txt + " ($" + stakes.toFixed(2) +
	    "), and you must decide how to split it between the two of you.</p><br><p>Here's how it works:</p>",
	    "<p>First, you will offer your partner some portion of the dollar.</p><p>You can offer them any amount between $0.00 and $" + stakes.toFixed(2) + ".</p>",
	    "<p>Once you make an offer, your partner may either accept or reject this offer.</p>" +
	    "<p>If they accept the offer, then they will receive the amount of money you offered to them, and you will get the rest. " +
	    "All of the money you earn through this game will be provided as a bonus after you complete the survey.</p>" +
	    "<p>If you reject the offer, then nobody gets any money after all.</p>",
	    "<img src='img/red_player.png' height='" + stim_size + "'>" +
	    "<img src='img/yellow_player.png' height='" + stim_size + "'>" +
	    "<img src='img/blue_player.png' height='" + stim_size + "'>" +
	    "<br><p>One more thing about this game: in each round of the game, you will play with one of three partners: Red, Yellow, or Blue. " +
	    "Before each round, you will be told which partner you are playing with.</p>"],
    show_clickable_nav: true
};
if (!TEST) propose_timeline.push(instructions_propose);

/* Display check questions and loop until correct */
var check_choices = ["Your partner gets the amount of money specified in the offer, but you get nothing.",
		     "Neither player recieves any money",
		     "Your partner gets the amount of money specified in the offer, and you get the rest.",
		     "You get the amount of money specified in the offer, and your partner gets the rest."];
if (!TEST)
    propose_timeline.push(check_q("check1", "Check question: what happens when your partner accepts an offer?", check_choices, 2),
			  check_q("check2", "Check question: what happens when your partner rejects an offer?", check_choices, 1));


/* test trials */
var propose_trial = {
    timeline: [{type: 'html-slider-response',
		stimulus: function () {
		    return avatar() + "<p>You are now playing with " +
			jsPsych.timelineVariable('player', true) + ".</p><p>" +
			"How much would you like to offer " +
			jsPsych.timelineVariable('player', true) + "?</p>"
		},
		labels: ["$0.00", "$" + stakes.toFixed(2)],
		on_finish: function (data) {
		    data.player = jsPsych.timelineVariable('player', true);
		    data.offer = data.response / 100;
		    
		    data.accept = Math.random() <
			jStat.beta.cdf(data.offer, jsPsych.timelineVariable('alpha', true),
				       jsPsych.timelineVariable('beta', true));
		    if (data.accept) {
			data.response = 'accept';
			data.earned = stakes - data.offer;
		    } else {
			data.response = 'reject';
			data.earned = 0.00;
		    }
		}
	       },

	       {type: 'instructions',
		pages: function () {
		    d = jsPsych.data.getLastTrialData().values()[0];
		    return [avatar() + "<p>You have offered " + d.player + " $" +
			    d.offer.toFixed(2) + " out of $" + stakes.toFixed(2) +".</p>" +
			    "<p>" + d.player + " has " + d.response + "ed your offer.<p>" +
			    "<p>As a result, you have earned $" + d.earned.toFixed(2) + ".</p>"
			   ]},
		show_clickable_nav: true,
		allow_backward: false
	       },
	       
	       {type: 'html-slider-response',
		stimulus: function () {
		    d = jsPsych.data.get().last(2).first(1).values()[0]
		    return avatar() + "<p>To what extent did " + d.player +
			" " + d.response + "ing your offer of $" + d.offer.toFixed(2) +
			" cause you to earn $" + d.earned.toFixed(2) + "?</p><br>"
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
propose_timeline.push(propose_trial);


/* Instructions for MCMC section */
var instructions_mcmc_propose = {
    type: 'instructions',
    pages: ["<p>Great work!</p><br><p>Now, we want to learn what you think of the different players in this game.</p>",
	    "<p>To do so, we will tell you which partner you are playing with, and we will tell you whether they have accepted an offer from you.</p>" +
	    "<p>Then you'll be shown two possible offers, and you will be asked:</p><br><p>\"Which offer is more likely?\"</p><br>" +
	    "<p>Please choose the offer amount that is most likely to lead to your partner to accepting or rejecting that offer.</p>"
	   ],
    show_clickable_nav: true
};
if (!TEST) propose_timeline.push(instructions_mcmc_propose);


var choices;  // use this var to keep track of the choices on every MCMC trial

/* MCMC trials */
var trials_mcmc_propose = {
    timeline: [{
	type: 'html-button-response',
	stimulus: function () {
	    return avatar() + "<p>You have made an offer to " +
		jsPsych.timelineVariable('player', true) +
		" and they have accepted your offer. Which offer is more likely?</p>"
	},
	choices: function () {
	    choices = jsPsych.timelineVariable('choices', true);
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
	    data.choices = choices;
	    data.choice = choices[data.button_pressed];
	    data.player = jsPsych.timelineVariable('player', true);
	    data.chain = jsPsych.timelineVariable('chain', true);
	}
    }],
    timeline_variables: mcmcParams,
    repetitions: mcmcTrials,
    randomize_order: true
};
propose_timeline.push(trials_mcmc_propose);
