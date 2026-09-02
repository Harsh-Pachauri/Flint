// scripts/seedTestUsers.js
//
// Dev/test-only seed: creates (or updates in place) 10 realistic test
// accounts + profiles for local Discover/recommendation/match testing.
//
// Identification convention: there is no isTestAccount/metadata field on
// User or Profile (and this script deliberately does not add one — see
// CLAUDE.md-equivalent guidance: don't invent parallel schema fields just
// for seeding). These accounts are instead identifiable by a fixed,
// grep-able convention: email matches /^TestUser\d{2}@gmail\.com$/i.
//
// Idempotent: every write is a query-by-stable-key + upsert (User by email,
// Profile by userId, College by name), so re-running this script converges
// to the same 10 users/profiles/colleges instead of duplicating them.
//
// Usage:
//   node scripts/seedTestUsers.js
//   (or: npm run seed:test-users)
//
// Requires MONGODB_URI (and the other backend/.env vars) to already be
// configured, exactly like running the server itself.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Profile, College } = require('../models');

// ---------------------------------------------------------------------
// College data. The 10 users were specced with distinct fictional
// "college email" domains (TU01@College01.com ... TU10@College10.com).
// The app has no per-user college-email field anywhere in the schema —
// Profile only carries a collegeId reference to a College document (name/
// city/country, no domain/email of its own) — so that hint is used only to
// decide how many distinct colleges to create and to pick sensible real
// names/cities for them, never persisted as a literal "college email".
//
// IMPORTANT, discovered while verifying this script against the running
// app: recommendationService.getRecommendations() (unlike the general
// Discover feed, which only filters by college when the client explicitly
// opts in via ?college=true) *unconditionally* restricts candidates to the
// viewer's own collegeId whenever one is set. Giving every user a distinct
// college — the literal reading of the 10 separate "College0N" email hints
// — would make GET /api/recommendations/:userId return zero candidates for
// all 10 users, which defeats the "recommendation scoring" testability
// requirement. So three same-city pairs deliberately SHARE one college
// (and also carry heavy interest/trait overlap, see USERS below) so those
// pairs produce real, non-zero recommendation scores; the remaining four
// users each get their own distinct college for cross-college Discover
// variety. This is a real, existing application behavior, not a bug this
// script works around — see the final report for the full writeup.
const COLLEGES = [
  { name: 'Meridian College', city: 'New York', country: 'USA' }, // TU01 + TU06
  { name: 'Harborview State University', city: 'Los Angeles', country: 'USA' }, // TU02
  { name: 'Golden Gate Polytechnic', city: 'San Francisco', country: 'USA' }, // TU07
  { name: 'Lakeshore University', city: 'Chicago', country: 'USA' }, // TU03 + TU08
  { name: 'Cascade State University', city: 'Seattle', country: 'USA' }, // TU04
  { name: 'Emerald Ridge College', city: 'Austin', country: 'USA' }, // TU09
  { name: 'Riverstone University', city: 'Boston', country: 'USA' } // TU05 + TU10
];

// [longitude, latitude] per city, each with a small per-user jitter
// applied below (~1-2km) so paired users are close but not identical.
const CITY_COORDS = {
  'New York': [-73.9857, 40.7484],
  'Los Angeles': [-118.2437, 34.0522],
  'San Francisco': [-122.4194, 37.7749],
  'Chicago': [-87.6298, 41.8781],
  'Seattle': [-122.3321, 47.6062],
  'Austin': [-97.7431, 30.2672],
  'Boston': [-71.0589, 42.3601]
};

function jitter(coords, seed) {
  const dx = ((seed * 37) % 100) / 5000 - 0.01;
  const dy = ((seed * 53) % 100) / 5000 - 0.01;
  return [Number((coords[0] + dx).toFixed(5)), Number((coords[1] + dy).toFixed(5))];
}

// Cloudinary publicId is just the part between /upload/v<version>/ and the
// file extension — parsed straight out of the URLs given for each user.
function publicIdFromUrl(url) {
  const match = url.match(/\/upload\/v\d+\/([^/.]+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : undefined;
}

// ---------------------------------------------------------------------
// The 10 users. genderPreference is deliberately mixed so the dataset
// exercises every discovery direction:
//   - 4 boys prefer 'female', 1 boy prefers 'both'
//   - 4 girls prefer 'male', 1 girl prefers 'both'
// That gives full mutual male<->female matching (every straight boy shows
// up for every straight girl and vice versa, per discoveryController's
// matchStage), plus the 'both' users cover the third preference value.
//
// Interests/traits/branch deliberately overlap within three same-metro
// pairs (New York / Chicago / Boston) for a strong contentScore signal,
// and only lightly or not at all across the rest, so recommendation
// scoring has real variation to inspect once you start swiping.
const USERS = [
  {
    email: 'TestUser01@gmail.com',
    password: 'TU01@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333353/Boy1_tthwdw.png',
    name: 'Ethan Brooks',
    age: 20,
    gender: 'male',
    genderPreference: 'female',
    datingType: 'see_where_it_goes',
    branch: 'Computer Science',
    year: 3,
    college: 'Meridian College',
    bio: "CS major who debugs by rubber-duck talking to whoever's in the library seat next to me. Always down for a coffee run between classes.",
    vibewords: ['golden retriever energy', 'low-key iconic'],
    interests: ['hiking', 'live music', 'coffee culture', 'photography', 'basketball', 'coding', 'travel'],
    traits: ['witty', 'ambitious', 'night-owl']
  },
  {
    email: 'TestUser02@gmail.com',
    password: 'TU02@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333353/Boy2_mpc3gy.png',
    name: 'Marcus Ellison',
    age: 22,
    gender: 'male',
    genderPreference: 'female',
    datingType: 'casual',
    branch: 'Film Studies',
    year: 2,
    college: 'Harborview State University',
    bio: "Film major, part-time skateboarder, full-time menace at trivia night. My camera roll is 90% sunsets and 10% my dog.",
    vibewords: ['chaotic good', 'main character energy'],
    interests: ['surfing', 'skateboarding', 'film photography', 'basketball', 'thrifting', 'live music', 'gaming'],
    traits: ['goofy', 'spontaneous', 'creative']
  },
  {
    email: 'TestUser03@gmail.com',
    password: 'TU03@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333353/Boy3_ygujat.png',
    name: 'Daniel Okafor',
    age: 23,
    gender: 'male',
    genderPreference: 'female',
    datingType: 'serious',
    branch: 'Business Administration',
    year: 4,
    college: 'Lakeshore University',
    bio: "Senior year, business major, still not sure what I want to do after graduation — but I make a mean pasta and I'm a great listener.",
    vibewords: ['soft launch', 'quietly competitive'],
    interests: ['coding', 'chess', 'basketball', 'true crime podcasts', 'cooking', 'running', 'astronomy'],
    traits: ['ambitious', 'empathetic', 'early-bird']
  },
  {
    email: 'TestUser04@gmail.com',
    password: 'TU04@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333355/Boy4_xhczjx.png',
    name: 'Owen Whitfield',
    age: 19,
    gender: 'male',
    genderPreference: 'female',
    datingType: 'campus_friends_first',
    branch: 'Environmental Science',
    year: 1,
    college: 'Cascade State University',
    bio: "Freshman, environmental science, allegedly here to save the planet but mostly here for the campus coffee shop's oat milk lattes.",
    vibewords: ['outdoorsy but make it aesthetic'],
    interests: ['hiking', 'coffee culture', 'indie music', 'rock climbing', 'photography', 'vintage cars', 'board games'],
    traits: ['laid-back', 'bookish', 'homebody-at-heart']
  },
  {
    email: 'TestUser05@gmail.com',
    password: 'TU05@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333354/Boy5_zwcoat.png',
    name: 'Julian Reyes',
    age: 21,
    gender: 'male',
    genderPreference: 'both',
    datingType: 'something_real',
    branch: 'English Literature',
    year: 3,
    college: 'Riverstone University',
    bio: "English lit major who reads poetry out loud when no one's around. Looking for someone to argue about book endings with.",
    vibewords: ['softboy energy', 'overthinker'],
    interests: ['poetry', 'coding', 'chess', 'running', 'live music', 'volunteering', 'travel'],
    traits: ['empathetic', 'bookish', 'creative']
  },
  {
    email: 'TestUser06@gmail.com',
    password: 'TU06@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333354/Girl1_tusyml.png',
    name: 'Ava Sinclair',
    age: 20,
    gender: 'female',
    genderPreference: 'male',
    datingType: 'see_where_it_goes',
    branch: 'Computer Science',
    year: 2,
    college: 'Meridian College',
    bio: "CS major, chronic overpacker of my tote bag, and I will absolutely make you a spreadsheet for date-night ideas.",
    vibewords: ['golden retriever energy', 'organized chaos'],
    interests: ['coffee culture', 'live music', 'photography', 'yoga', 'travel', 'poetry', 'thrifting'],
    traits: ['witty', 'ambitious', 'creative']
  },
  {
    email: 'TestUser07@gmail.com',
    password: 'TU07@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333356/Girl2_ckmigl.png',
    name: 'Priya Nair',
    age: 22,
    gender: 'female',
    genderPreference: 'male',
    datingType: 'study_partner',
    branch: 'Data Science',
    year: 4,
    college: 'Golden Gate Polytechnic',
    bio: "Data science senior, professionally caffeinated. Will absolutely make you a study playlist and expect nothing in return.",
    vibewords: ['type A but chill about it'],
    interests: ['coding', 'hiking', 'rock climbing', 'board games', 'coffee culture', 'astronomy', 'running'],
    traits: ['ambitious', 'early-bird', 'athletic']
  },
  {
    email: 'TestUser08@gmail.com',
    password: 'TU08@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333357/Girl3_uz4q5n.png',
    name: 'Chloe Bennett',
    age: 21,
    gender: 'female',
    genderPreference: 'male',
    datingType: 'either',
    branch: 'Business Administration',
    year: 2,
    college: 'Lakeshore University',
    bio: "Sophomore business major who's already run three side hustles out of my dorm room. Ask me about my candle business.",
    vibewords: ['main character energy', 'hustle culture (affectionately)'],
    interests: ['true crime podcasts', 'chess', 'cooking', 'basketball', 'baking', 'running', 'gardening'],
    traits: ['ambitious', 'goofy', 'empathetic']
  },
  {
    email: 'TestUser09@gmail.com',
    password: 'TU09@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333357/Girl4_rnngiz.png',
    name: 'Zoe Martinez',
    age: 24,
    gender: 'female',
    genderPreference: 'male',
    datingType: 'casual',
    branch: 'Fine Arts',
    year: 3,
    college: 'Emerald Ridge College',
    bio: "Fine arts major, part-time open mic heckler (supportive kind). My apartment has more plants than furniture at this point.",
    vibewords: ['chaotic good', 'plant mom'],
    interests: ['live music', 'thrifting', 'skateboarding', 'stand-up comedy', 'vintage cars', 'film photography', 'travel'],
    traits: ['spontaneous', 'creative', 'goofy']
  },
  {
    email: 'TestUser10@gmail.com',
    password: 'TU10@123',
    photo: 'https://res.cloudinary.com/dzyhbyyaf/image/upload/v1788333358/Girl5_mvg61v.png',
    name: 'Sophia Lindqvist',
    age: 21,
    gender: 'female',
    genderPreference: 'both',
    datingType: 'something_real',
    branch: 'English Literature',
    year: 2,
    college: 'Riverstone University',
    bio: "English lit, perpetually mid-reread of something. Looking for someone who'll actually finish the book before we watch the movie.",
    vibewords: ['softgirl energy', 'overthinker'],
    interests: ['poetry', 'volunteering', 'running', 'coding', 'chess', 'pottery', 'travel'],
    traits: ['empathetic', 'bookish', 'creative']
  }
];

async function seedColleges() {
  const collegeIdByName = {};
  for (const c of COLLEGES) {
    const doc = await College.findOneAndUpdate(
      { name: c.name },
      { $set: { name: c.name, city: c.city, country: c.country } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    collegeIdByName[c.name] = doc._id;
  }
  return collegeIdByName;
}

async function seedUser(spec, collegeIdByName, index) {
  const passwordHash = await bcrypt.hash(spec.password, 10);

  const user = await User.findOneAndUpdate(
    { email: spec.email.toLowerCase() },
    {
      $set: {
        email: spec.email.toLowerCase(),
        passwordHash,
        status: 'active',
        role: 'user',
        onboardingComplete: true,
        lastActive: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const coords = jitter(CITY_COORDS[COLLEGES.find((c) => c.name === spec.college).city], index + 1);
  const publicId = publicIdFromUrl(spec.photo);

  await Profile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        userId: user._id,
        collegeId: collegeIdByName[spec.college],
        name: spec.name,
        age: spec.age,
        bio: spec.bio,
        gender: spec.gender,
        genderPreference: spec.genderPreference,
        datingType: spec.datingType,
        branch: spec.branch,
        year: spec.year,
        depart: spec.branch,
        vibewords: spec.vibewords,
        interests: spec.interests,
        personality: {
          introvertExtrovert: 40 + ((index * 13) % 40),
          chillIntense: 30 + ((index * 17) % 50),
          homebodyAdventurous: 35 + ((index * 11) % 45),
          traits: spec.traits
        },
        photos: [
          {
            url: spec.photo,
            publicId,
            uploadedAt: new Date()
          }
        ],
        location: {
          type: 'Point',
          coordinates: coords,
          address: `${COLLEGES.find((c) => c.name === spec.college).city}, USA`
        },
        aiAssessmentScore: 65 + ((index * 7) % 30),
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating_app';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`Connected to MongoDB (db: ${mongoose.connection.name})`);

  const collegeIdByName = await seedColleges();
  console.log(`Colleges ready: ${Object.keys(collegeIdByName).length}`);

  for (let i = 0; i < USERS.length; i++) {
    const spec = USERS[i];
    const user = await seedUser(spec, collegeIdByName, i);
    console.log(`✓ ${spec.email} -> userId ${user._id}`);
  }

  console.log(`\nSeed complete: ${USERS.length} users/profiles upserted.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { USERS, COLLEGES };
