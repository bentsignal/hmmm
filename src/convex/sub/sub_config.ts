// user can use up to 75% of their plan's price. Hopefully
// can be increased in the future, just need to see how all
// of the other recurring costs stack up
export const ALLOWED_USAGE_PERCENTAGE = 0.75;

// free tier can incur 1 cent of cost per day
export const FREE_TIER_MAX_USAGE = 0.01;

// ultra is the highest tier a user can purchase, unlimited
// must be manually granted to a user
export const HIGHEST_TIER_PUBLIC_PLAN = "Ultra";
