# Five Crowns Mobile App - Planning Documentation

This folder contains comprehensive planning documentation for converting the Five Crowns web app into a native mobile application with user accounts, friend system, and multiple concurrent games.

## 📚 Documentation Overview

### 1. [mobile-app-migration.md](mobile-app-migration.md)
**Complete migration strategy and architecture overview**

- Technology stack decision (React Native vs Flutter)
- Architecture diagrams
- Database schema overview
- Project structure
- Phase breakdown (Weeks 1-15)
- Success metrics and timeline

**Read this first** to understand the overall approach.

---

### 2. [firebase-schema.md](firebase-schema.md)
**Detailed Firebase backend architecture**

- Firestore collections structure
- Realtime Database schema
- TypeScript interfaces for all data types
- Security rules (Firestore & Realtime DB)
- Cloud Functions implementation
- Firestore indexes
- Setup instructions
- Cost estimates

**Use this** when implementing backend features.

---

### 3. [quick-start-guide.md](quick-start-guide.md)
**Step-by-step setup guide for getting started**

- Prerequisites and tools needed
- Firebase project setup
- React Native project initialization
- Dependency installation
- Firebase configuration
- Running the app (iOS/Android)
- Troubleshooting common issues
- Next development steps

**Start here** when you're ready to begin development.

---

### 4. [code-migration-guide.md](code-migration-guide.md)
**Porting existing game logic to React Native**

- Type definitions (TypeScript)
- Deck management migration
- Card validation logic
- Firebase integration patterns
- Component migration (HTML → React Native)
- Drag and drop implementation
- Turn management
- Testing strategy

**Reference this** when converting web app code to React Native.

---

### 5. [push-notifications-guide.md](push-notifications-guide.md)
**Complete push notification implementation**

- Expo Notifications setup
- FCM token registration
- Notification types (turn, friend request, invitation)
- Cloud Functions for notifications
- Badge management
- Testing notifications
- Best practices
- Troubleshooting

**Follow this** when implementing notification features.

---

### 6. [implementation-roadmap.md](implementation-roadmap.md)
**Week-by-week implementation plan**

- 14-week detailed roadmap
- Daily task breakdown
- Deliverables for each week
- Success metrics
- Resource requirements
- Risk management
- Alternative PWA approach

**Use this** to track progress and stay on schedule.

---

## 🚀 Getting Started

### Decision Point: React Native or PWA?

**Option A: Native Mobile App (React Native)**
- **Timeline:** 10-15 weeks
- **Pros:** True native experience, App Store presence, push notifications
- **Cons:** Steeper learning curve, longer development time
- **Best for:** Long-term vision, serious commitment to mobile

**Option B: Enhanced PWA (Progressive Web App)**
- **Timeline:** 2-3 weeks
- **Pros:** Faster development, reuse existing code
- **Cons:** Limited iOS features, no App Store, less native feel
- **Best for:** Quick validation, testing concept

### Recommended Reading Order

1. **[mobile-app-migration.md](mobile-app-migration.md)** - Understand the big picture
2. **[implementation-roadmap.md](implementation-roadmap.md)** - See the week-by-week plan
3. **[quick-start-guide.md](quick-start-guide.md)** - Set up your environment
4. **[firebase-schema.md](firebase-schema.md)** - Understand backend structure
5. **[code-migration-guide.md](code-migration-guide.md)** - Learn migration patterns
6. **[push-notifications-guide.md](push-notifications-guide.md)** - Implement notifications (Week 9)

---

## 📋 Pre-Development Checklist

Before starting development, ensure you have:

### Accounts & Access
- [ ] Firebase account created
- [ ] Apple Developer account ($99/year) - *for iOS*
- [ ] Google Play Console account ($25 one-time) - *for Android*
- [ ] Expo account (free)

### Development Environment
- [ ] Node.js (v16+) installed
- [ ] npm or yarn installed
- [ ] VS Code (or preferred editor)
- [ ] Git installed
- [ ] Mac computer (required for iOS development)
- [ ] Xcode installed (Mac only, for iOS)
- [ ] Android Studio installed (optional, for Android emulator)

### Physical Devices
- [ ] iPhone (for iOS testing)
- [ ] Android phone (for Android testing)
- [ ] Both devices have Expo Go app installed

### Knowledge & Skills
- [ ] Basic JavaScript/TypeScript knowledge
- [ ] Familiar with React (helpful but not required)
- [ ] Understanding of async/await and Promises
- [ ] Basic Firebase knowledge (or willing to learn)

---

## 🎯 Key Features to Implement

### Phase 1: Foundation (Weeks 1-2)
- ✅ Firebase Authentication
- ✅ User profiles
- ✅ Navigation structure

### Phase 2: Social (Weeks 3-4)
- 👥 Friend system (add, accept, decline)
- 🎮 Active games list
- 🔍 Search for friends

### Phase 3: Game Lobby (Week 5)
- 🎲 Create/join games
- 👑 Real-time lobby
- ⚙️ Game settings

### Phase 4: Gameplay (Weeks 6-8)
- 🃏 Card rendering
- 🎯 Turn-based gameplay
- 🏆 Scoring and rounds
- 🎊 "Go Out" validation

### Phase 5: Polish (Weeks 9-10)
- 🔔 Push notifications
- 🎨 UI polish
- 🧪 Testing
- 🐛 Bug fixes

### Phase 6: Launch (Weeks 11-14)
- 📱 App store assets
- 🚀 Beta testing
- 📤 App submission
- 📊 Monitoring

---

## 💰 Budget Estimate

### One-Time Costs
| Item | Cost |
|------|------|
| Apple Developer Program (annual) | $99 |
| Google Play Console (one-time) | $25 |
| **Total** | **$124** |

### Monthly Costs (100-500 users)
| Service | Cost |
|---------|------|
| Firebase (Blaze Plan) | $10-50 |
| Cloud Functions | $5-15 |
| **Total/month** | **$15-65** |

### First Year Total: ~$300-900

---

## ⏱️ Time Estimates

| Task | Optimistic | Realistic | Pessimistic |
|------|------------|-----------|-------------|
| **Setup & Learning** | 1 week | 2 weeks | 3 weeks |
| **Authentication** | 1 week | 1 week | 2 weeks |
| **Friend System** | 1 week | 2 weeks | 3 weeks |
| **Game Lobby** | 1 week | 1 week | 2 weeks |
| **Gameplay** | 3 weeks | 4 weeks | 6 weeks |
| **Polish & Testing** | 1 week | 2 weeks | 3 weeks |
| **App Store Prep** | 1 week | 2 weeks | 3 weeks |
| **Total** | **9 weeks** | **14 weeks** | **22 weeks** |

**Recommendation:** Plan for 14-16 weeks for your first mobile app.

---

## 🎓 Learning Resources

### React Native
- [Official React Native Tutorial](https://reactnative.dev/docs/tutorial)
- [React Native Express](https://www.reactnative.express/)
- [Expo Documentation](https://docs.expo.dev/)

### Firebase
- [Firebase for React Native](https://rnfirebase.io/)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript with React](https://react-typescript-cheatsheet.netlify.app/)

### Community Support
- [Stack Overflow - React Native](https://stackoverflow.com/questions/tagged/react-native)
- [Expo Forums](https://forums.expo.dev/)
- [Reddit - r/reactnative](https://www.reddit.com/r/reactnative/)
- [Discord - Reactiflux](https://www.reactiflux.com/)

---

## 🚧 Common Challenges & Solutions

### Challenge 1: "React Native feels overwhelming"
**Solution:** Start with Expo managed workflow. It handles most native configurations automatically.

### Challenge 2: "Real-time sync is buggy"
**Solution:** Use Firebase Realtime Database listeners properly. Always clean up with `off()` in useEffect cleanup.

### Challenge 3: "Push notifications don't work"
**Solution:** Test on physical devices only. Simulators don't support push notifications.

### Challenge 4: "App store rejection"
**Solution:** Read Apple's guidelines carefully. Use TestFlight for pre-release testing.

### Challenge 5: "Firebase costs are high"
**Solution:** Implement pagination, cache data locally, use Firestore indexes efficiently.

---

## 📞 Support

If you get stuck:

1. **Check documentation** in this folder first
2. **Search Stack Overflow** with specific error messages
3. **Ask in Expo Forums** for Expo-specific questions
4. **Join React Native Discord** for real-time help
5. **Review existing web app code** in `../js/` for reference

---

## 🎯 Success Criteria

Your app is ready to launch when:

- ✅ Users can register and login
- ✅ Users can add and manage friends
- ✅ Users can create and join games
- ✅ Games work correctly with 2-6 players
- ✅ Turn notifications work reliably
- ✅ App doesn't crash (>99% crash-free rate)
- ✅ Tested on multiple iOS and Android devices
- ✅ App passes Apple and Google review guidelines
- ✅ Firebase costs are within budget

---

## 📝 Notes

- This is your **first mobile app** - be patient with yourself!
- Focus on **core features first**, polish later
- **Test frequently** on real devices
- **Ask for help** when stuck (learning is part of the process)
- **Celebrate milestones** (first successful build, first multiplayer game, etc.)
- **Keep the web app running** during development (don't break existing users)

---

## 🎉 You've Got This!

Converting a web app to mobile is a significant undertaking, but with this planning documentation and the roadmap, you have everything you need to succeed.

**Remember:**
- Take it one week at a time
- Reference these docs frequently
- Test early and often
- Don't hesitate to ask for help
- Enjoy the learning journey!

**Next Step:** Read [mobile-app-migration.md](mobile-app-migration.md) to understand the overall strategy.

---

Made with 💜 for the Five Crowns project 👑
