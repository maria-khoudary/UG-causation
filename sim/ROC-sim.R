library(ggplot2)
library(tidyr)
library(dplyr)
library(brms)
library(modelr)
library(tidybayes)
library(viridis)

#################################### Parameters #####################################
## Experiment Parameters
LOW_SENSORY <- 10
HIGH_SENSORY <- 20
TRIALS <- LOW_SENSORY + HIGH_SENSORY
SUBJECTS <- 50
MAX_CONF <- 4 # play with this to see how many levels of confidence is effective for your question
## splits up into: 
## Old: yes/no
## Confidence: 1-3

## SDT Parameters -- best to get these from existing data/papers
MU_IMAGERY <- 0.18^0.75 * 4      # mu calculated using the sensory power law described in Brascamp et al (2007)
MU_LOW_SENSORY <- 0.2^0.75 * 4
MU_HIGH_SENSORY <- 1^0.75 * 4
MU_DPRIME <- MU_HIGH_SENSORY - MU_LOW_SENSORY 
SD_DPRIME <- 0.25  ## participant-level variance in dprime
SD_THRESHOLDS <- 0.1 ## participant-level variance in thresholds
SD_LOW_SENSORY <- 0.75 ## SD_HIGH_SENSORY is fixed to 1, low sensory items are more variable
SD_IND_LOW_SENSORY <- 0.99 ## participant-level variation in LOW_SENSORY; .012*sqrt(238) if we wanna proxy by reinstatement
                       ## average variance in imagery abilities --> we're gonna regress this out so for now i'm putting a high-ish number


################################ Helper Functions ####################################
## Simulate ideal SDT agent
ideal_resp <- function(signal, ...) {
    return(1 + sum(c(...) < signal))
}

## Get empirical ROC point for rating
roc <- function(df, rating) {
    if (nrow(df) == 0) return(0)
    return(sum(df$rating >= rating) / nrow(df))
}

## extract posterior draws of the ROC curve
roc_draws <- function(model, data) {
    f <- data %>% data_grid(old) %>%
        add_fitted_draws(model, re_formula=NA) %>% ungroup %>%
        mutate(.category = as.integer(.category)) %>%
        arrange(.category, old, .row, .draw)
    
    ## convert the probabilities to cumulative probabilities
    blocks <- max(f$.category)
    blocksize <- nrow(f)/blocks
    for (block in 1:(blocks-1)) {
        i <- ((block-1)*blocksize + 1):(block*blocksize)
        for (block2 in (block+1):blocks) {
            j <- ((block2-1)*blocksize + 1):(block2*blocksize)
            f$.value[i] <- f$.value[i] + f$.value[j]
        }
    }
    
    return(f)
}



################################## SDT Simulation ####################################
## Simulate participant-level parameters & signal for each stimulus
df <- data.frame(id=rep(1:SUBJECTS, each=TRIALS),
                 perceive=rep(rep(c(0,1), c(LOW_SENSORY, HIGH_SENSORY)), SUBJECTS),
                 dprime=rep(rnorm(SUBJECTS, MU_DPRIME, SD_DPRIME), each=TRIALS),
                 offset=rep(rnorm(SUBJECTS, 0, SD_THRESHOLDS), each=TRIALS),
                 sd_perceive=rep(rnorm(SUBJECTS, 0.25, 0.05), each=TRIALS)) %>%
    mutate(signal=rnorm(TRIALS*SUBJECTS, perceive*dprime, sd_perceive**perceive))

## Add subject-specific thresholds
for (i in 0:(MAX_CONF-2)) {
    df[,paste0('thresh', i+1)] <-
        rep(i/(MAX_CONF-2), TRIALS*SUBJECTS) * df$dprime + df$offset #offset allows ppts to have different criteria
}

## Simulate ideal SDT respose
df <- df %>% rowwise() %>%
    mutate(rating=do.call(ideal_resp,
                          c(signal,
                            lapply(paste0('thresh', 1:(MAX_CONF-1)),
                                   function(t) df[row_number(),t]))),
           response=as.integer(rating > MAX_CONF / 2)) %>% ungroup

df %>% data_grid(id, perceive, rating) %>%
    group_by(id, perceive, rating) %>%
    summarize(r=roc(df[df$id==id & df$perceive==perceive,], rating)) %>% #subject-level hit & FA rate 
    ungroup() %>%
    mutate(perceive=ifelse(perceive, 'Hits', 'FAs')) %>%
    pivot_wider(names_from=perceive, values_from=r) %>%
    group_by(rating) %>%
    summarize(Hits.mean=mean(Hits), Hits.lower=mean_cl_normal(Hits)$ymin,
              Hits.upper=mean_cl_normal(Hits)$ymax,
              FAs.mean=mean(FAs),
              FAs.lower=mean_cl_normal(FAs)$ymin,
              FAs.upper=mean_cl_normal(FAs)$ymax) %>%
    ggplot(aes(x=FAs.mean, xmin=FAs.lower, xmax=FAs.upper,
               y=Hits.mean, ymin=Hits.lower, ymax=Hits.upper)) +
    geom_line() + geom_point() + geom_errorbar() + geom_errorbarh() +
    geom_abline(intercept=0, slope=1) + coord_cartesian(c(0,1), c(0,1)) +
    xlab('False Alarm Rate') + ylab('Hit Rate') + theme_classic()




################################### SDT Analysis #####################################
## set sd intercept to 0 to force sd(new) to 1
m <- brm(bf(rating ~ perceive + (1 + perceive |i| id)), #intercepts = biases, coef for perceive = dprime
            disc ~ 0 + perceive + (0 + perceive |i| id)), #disc=SD before doing probit transform; allows for unequal variance of evidence distributions
         prior=c(prior(normal(0, 1), class='b', coef='perceive')),
                 prior(normal(-MU_DPRIME, SD_LOW_SENSORY), class='b', coef='imagine', dpar='disc')),
         data=df, family=cumulative(link='probit'), iter = 5000, cores=4, file='sdt',
         save_all_pars=TRUE, sample_prior=TRUE)

summary(m)
# group-level effects = random effects
# credible intervals = 95% probability that value is in the range; use these to determine whether you have enough data 
# to simulate your model; if ground truth is in credible interval, you're good
plot(m)


## Plot rating probabilities from which ROC curves are made
df %>% data_grid(perceive) %>%
    add_fitted_draws(m, re_formula=NA) %>% ungroup %>% #gives posteriors over each value of variable we're gridding over
        mutate(.category = as.integer(.category),
               perceive=ifelse(perceive==1, 'Perceived', 'Imagined')) %>%
        ggplot(aes(x=.category, y=.value, fill=perceive)) +
        stat_eye() + coord_cartesian(ylim=c(0, 0.5)) +
        xlab('Rating') + ylab('Probability') +
        theme_classic()

## Plot log odds of New/Old response
f %>% group_by(.category) %>%
    select(-.row) %>%
    pivot_wider(names_from=old, values_from=.value) %>%
    mutate(odds=New/Old) %>%
    ggplot(aes(x=.category, y=log(odds))) +
        geom_eye() +
        xlab('Rating') + 
        theme_classic()



## Extract posterior draws
draws <- roc_draws(m, df)

## Plot Posterior ROC curves
draws %>% mutate(old=ifelse(old==1, 'Hits', 'FAs')) %>%
    select(-.row) %>%
    pivot_wider(names_from=old, values_from=.value) %>%
    ggplot(aes(x=FAs, y=Hits, group=.category)) +
    stat_density2d(aes(fill=stat(nlevel), alpha=stat(nlevel)),
                   geom='polygon', h=c(0.1, 0.1), show.legend=FALSE) +
    geom_line(aes(group=.draw), alpha=0.005) +
    ggtitle('Posterior ROC Curves') +
    scale_fill_viridis(option="magma") +
    geom_abline(slope=1, intercept=0, size=1.5) +
    xlab('FA Rate') + ylab('Hit Rate') + coord_cartesian(c(0,1), c(0,1)) +
    theme_classic()

## Plot medians & 95% HDIs
draws %>%
    mutate(old=ifelse(old==1, 'Hits', 'FAs')) %>%
    group_by(old, .category) %>%
    median_hdi(.value) %>%
    pivot_wider(names_from=old, values_from=c(.value, .lower, .upper),
                names_sep='.') %>%
    ggplot(aes(x=.value.FAs, xmin=.lower.FAs, xmax=.upper.FAs,
               y=.value.Hits, ymin=.lower.Hits, ymax=.upper.Hits,)) +
    geom_point(size=3) + geom_line(size=1, alpha=0.4) +
    geom_errorbar() + geom_errorbarh() + ggtitle('Median ROC Curve + 95% HDIs') +
    geom_abline(slope=1, intercept=0, size=2) +
    xlab('FA Rate') + ylab('Hit Rate') + coord_cartesian(c(0,1), c(0,1)) +
    theme_classic()

