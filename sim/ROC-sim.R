library(ggplot2)
library(tidyr)
library(dplyr)
library(brms)
library(modelr)
library(tidybayes)

## Experiment Parameters
OLD_TRIALS <- 7
NEW_TRIALS <- 14
TRIALS <- OLD_TRIALS + NEW_TRIALS
SUBJECTS <- 100
MAX_CONF <- 10

## SDT Parameters
MU_DPRIME <- 2.0
SD_DPRIME <- 0.25
SD_THRESHOLDS <- 0.05

ideal_resp <- function(signal, ...) {
    return(1 + sum(c(...) < signal))
}

df <- data.frame(id=rep(1:SUBJECTS, each=TRIALS),
                 old=rep(rep(c(0,1), c(NEW_TRIALS, OLD_TRIALS)), SUBJECTS),
                 dprime=rep(rnorm(SUBJECTS, MU_DPRIME, SD_DPRIME), each=TRIALS),
                 offset=rep(rnorm(SUBJECTS, 0, SD_THRESHOLDS), each=TRIALS))

## Add subject-specific thresholds
for (i in 0:(MAX_CONF-2)) {
    df[,paste0('thresh', i+1)] <-
        rep(i/(MAX_CONF-2), TRIALS*SUBJECTS) * df$dprime + df$offset
}

df <- df %>%
    mutate(signal=rnorm(TRIALS*SUBJECTS, old*dprime)) %>%
    rowwise() %>%
    mutate(rating=do.call(ideal_resp,
                          c(signal,
                            lapply(paste0('thresh', 1:(MAX_CONF-1)),
                                   function(t) df[,t]))),
           response=as.integer(rating > MAX_CONF / 2)) %>% ungroup

roc <- function(df, rating) {
    if (nrow(df) == 0) return(0)
    return(sum(df$rating >= rating) / nrow(df))
}

df %>% data_grid(id, old, rating) %>%
    group_by(id, old, rating) %>%
    summarize(r=roc(df[df$id==id & df$old==old,], rating)) %>%
    ungroup() %>%
    mutate(old=ifelse(old, 'Hits', 'FAs')) %>%
    pivot_wider(names_from=old, values_from=r) %>%
    ggplot(aes(x=FAs, y=Hits, color=rating)) +
    stat_smooth() + theme_classic()




m <- brm(rating ~ old + (1 + old | id),
         data=df, cores=4, file='sdt',
         family=cumulative(link='probit'))

draws <- gather_draws(m, b_old, `b_Intercept[1]`,
                      `b_Intercept[2]`, `b_Intercept[3]`,
                      `b_Intercept[4]`, `b_Intercept[5]`)

samples <- df %>% data_grid(old) %>%
    add_fitted_draws(m, re_formula=NA)

predictions <- predicted_draws(m, df, n=50)  %>%
    mutate(.prediction=as.integer(.prediction),
           .predicted_old=as.integer(.prediction > MAX_CONF / 2))

p <- predictions %>% ungroup %>%
    mutate(old=ifelse(old, 'FAs', 'Hits')) %>%
    group_by(old, .draw, .prediction) %>%
    summarize(resp=mean(.predicted_old == 1)) %>%
    pivot_wider(names_from=old, values_from=resp)


predictions %>% data_grid(.draw, old, .prediction) %>%
    group_by(.draw, old, .prediction) %>%
    summarize(r=roc(predictions[predictions$.draw==.draw & predictions$old==old,],
                    .prediction)) %>%
    ungroup() %>%
    mutate(old=ifelse(old, 'Hits', 'FAs')) %>%
    pivot_wider(names_from=old, values_from=r) %>%
    ggplot(aes(x=FAs, y=Hits, color=.prediction)) + geom_point() +
    stat_smooth() + theme_classic()
