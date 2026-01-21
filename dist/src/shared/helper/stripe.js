import Stripe from "stripe";
import ENV from "../../config/env.js";
export const stripe = new Stripe(ENV.STRIPE.STRIPE_SECRET_KEY);
//# sourceMappingURL=stripe.js.map