# ttlock-sdk-js

The goal of this project is to make a partial JavaScript port of the TTLock Android SDK enough to make it work with the biometric locks.

At a minimum, it should be able to:
- [x] discover locks
- [x] initialize locks
- [ ] add administrators
- [ ] lock/unlock
- [ ] receive lock events

> At the moment, it only works with locks that use the V3 protocol for communication.

> This is just an SDK providing the means to communicate with the locks, it is not an app providing the full functionality of the TTLock app.
