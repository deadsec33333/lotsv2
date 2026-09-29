// The template: every slot on the page, in page order, with its
// default ("unclaimed") content. 165 slots in total.
//
// kind:   text | link | image | background   (what the slot holds before upgrades)
// room:   s = small, m = wide enough for an image (160x32), l = big enough for video (320x180)
// weight: how valuable the slot is. Starting price = floor x weight.

const L = [];
function def(path, kind, weight, text, opts = {}) {
  L.push({ path, kind, weight, text, room: opts.room || (kind === 'image' ? 'm' : 's'), long: !!opts.long, style: opts.style || {} });
}

// Top bar
def('TOPBAR.LOGO', 'image', 30, 'Logo', { room: 's' });
def('TOPBAR.WORDMARK', 'text', 30, 'PROJECT_NAME');

// Announcement strip
def('STRIP.BG', 'background', 6, 'Strip background', { room: 'l' });
for (let i = 1; i <= 7; i++) def(`STRIP.${i}`, 'text', 14, i === 1 ? 'Your announcement here' : 'Buy this line');

// Nav row
const navKinds = ['link', 'image', 'link', 'link', 'text', 'link', 'text', 'link', 'image', 'link', 'text', 'link'];
navKinds.forEach((k, i) => def(`NAV.${i + 1}`, k, 24, k === 'image' ? 'Icon' : ['Features', 'Pricing', 'Docs', 'Blog', 'Careers', 'Login'][i % 6], { room: 's' }));

// Hero
def('HERO.BG', 'background', 10, 'Hero background', { room: 'l' });
def('HERO.EYEBROW', 'text', 16, 'THE BEST SEAT ON THE PAGE');
def('HERO.TAG', 'text', 14, 'NEW');
def('HERO.HEADLINE', 'text', 60, 'Your ad here. {views} page views per 7d rolling.');
def('HERO.STRIKE', 'text', 14, 'a normal website');
def('HERO.BUTTON', 'link', 24, 'GET STARTED');
def('HERO.CHIP', 'text', 10, 'Buy this chip');
def('HERO.SMALL', 'text', 8, 'TRUSTED BY NOBODY YET');
def('HERO.IMAGE', 'image', 50, 'THIS IMAGE IS FOR SALE TOO', { room: 'l' });

// Band: advertise + tiles
def('BAND.BG', 'background', 6, 'Band background', { room: 'l' });
def('BAND.TITLE', 'text', 14, 'ADVERTISE YOUR PROJECT HERE');
for (let i = 1; i <= 6; i++) def(`BAND.TILE${i}`, 'image', 8, 'Tile', { room: 'm' });

// Testimonials
def('TESTIMONIALS.KICKER', 'text', 6, 'WHAT PEOPLE ARE SAYING');
def('TESTIMONIALS.DISPLAY', 'text', 16, 'Loved by teams everywhere');
for (let i = 1; i <= 4; i++) {
  def(`TESTIMONIALS.${i}.ICON`, 'image', 5, 'Avatar', { room: 's' });
  def(`TESTIMONIALS.${i}.NAME`, 'text', 6, 'Buy this name');
  def(`TESTIMONIALS.${i}.BODY`, 'text', 8, 'You can buy this testimonial and say whatever you want about us.', { long: true });
}

// Buyable section
def('SHOWCASE.KICKER', 'text', 4, 'BUYABLE SECTION');
for (let i = 1; i <= 5; i++) def(`SHOWCASE.LIST${i}`, 'text', 5, 'Buy this bullet');
def('SHOWCASE.BOXED', 'text', 6, 'Buy this box');
def('SHOWCASE.IMAGE', 'image', 20, 'THIS AD IS FOR SALE', { room: 'l' });
def('SHOWCASE.LONG', 'text', 8, 'Buy this paragraph and write anything you like in it.', { long: true });
def('SHOWCASE.RENT.TITLE', 'text', 6, 'RENT THIS SPACE');
def('SHOWCASE.RENT.BODY', 'text', 6, 'Short headline for the rent block', { long: true });
def('SHOWCASE.RENT.P1', 'text', 3, '1 day = ask the owner');
def('SHOWCASE.RENT.P2', 'text', 3, '3 days = ask the owner');
def('SHOWCASE.RENT.P3', 'text', 3, '7 days = ask the owner');
def('SHOWCASE.RENT.DM', 'link', 5, 'DM HERE');

// Stats band
def('STATS.BG', 'background', 6, 'Stats background', { room: 'l' });
def('STATS.1.VALUE', 'text', 10, '{slots}');
def('STATS.1.CAPTION', 'text', 3, 'BUYABLE ELEMENTS');
for (let i = 2; i <= 4; i++) {
  def(`STATS.${i}.VALUE`, 'text', 10, ['99%', '24/7', '0'][i - 2]);
  def(`STATS.${i}.CAPTION`, 'text', 3, 'BUY THIS STAT');
}

// Features
def('FEATURES.ARROW', 'text', 6, '→ [ Everything you need, nothing you don’t ]');
for (let i = 1; i <= 6; i++) {
  def(`FEATURES.${i}.TITLE`, 'text', 5, 'Feature title');
  def(`FEATURES.${i}.ICON`, 'image', 4, 'Icon', { room: 's' });
  def(`FEATURES.${i}.NAME`, 'text', 5, 'BUY THIS NAME');
  def(`FEATURES.${i}.SUB`, 'text', 3, 'and this subtitle');
}

// Pricing tiers
def('PRICING.KICKER', 'text', 4, 'PRICING');
['Starter', 'Pro', 'Enterprise'].forEach((name, t) => {
  const n = t + 1;
  def(`PRICING.${n}.NAME`, 'text', 5, `Buy this tier name`);
  def(`PRICING.${n}.PRICE`, 'text', 8, ['$0', '$29', 'Custom'][t]);
  def(`PRICING.${n}.BLURB`, 'text', 4, 'Buy this blurb and describe whatever you like');
  for (let j = 1; j <= 3; j++) def(`PRICING.${n}.LINE${j}`, 'text', 3, 'Buy this feature line');
  def(`PRICING.${n}.BUTTON`, 'link', 5, 'BUY THIS BUTTON');
});

// Logo strip
def('LOGOS.BG', 'background', 4, 'Logo strip background', { room: 'l' });
for (let i = 1; i <= 12; i++) def(`LOGOS.${i}`, 'image', 4, 'You can buy this logo.', { room: 'm' });

// FAQ
def('FAQ.KICKER', 'text', 4, 'FREQUENTLY ASKED QUESTIONS');
for (let i = 1; i <= 5; i++) {
  def(`FAQ.${i}.QUESTION`, 'text', 5, 'Buy this question');
  def(`FAQ.${i}.ANSWER`, 'text', 4, 'And answer it however you want.', { long: true });
}

// Big ad
def('AD.DISPLAY', 'text', 14, 'YOUR BRAND');
def('AD.LINK', 'link', 6, 'yourlink.here');
def('AD.BUTTON', 'link', 6, 'CLICK ME');

// Footer band: 5 columns
def('FOOTER.BG', 'background', 4, 'Footer background', { room: 'l' });
[3, 3, 3, 2, 2].forEach((count, c) => {
  for (let j = 1; j <= count; j++) def(`FOOTER.${c + 1}.${j}`, 'link', 3, 'Buy this link');
});

export const LAYOUT = L;
