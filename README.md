# lrbalance4strava

Userscript that adds a L/R power chart in Strava's activity Analysis viewpane 

![image](https://github.com/dmwnz/lrbalance4strava/assets/33037675/e75405f6-ad03-4f81-a5ef-f5f903507497)

_How to use_
- You need to have a browser extension that enables user scripts (Greasemonkey, Tampermonkey...)
- Click here: https://github.com/dmwnz/lrbalance4strava/raw/master/lrbalance4strava.user.js
- Your user script extension should offer to install the script, just need to click OK
- Done!

_Uninstall_
- Remove the script from your user scripts.

_How does it work ?_
- Fetches original .FIT file for activity
- Reads L/R Power Balance if available
- Adds the data stream to the list of drawn data

_Notes_
- Only works for your own activities
- Only works if the activity was recorded as a .FIT file (this is the format used by most head units)
- Only works if original .FIT file contains the data (duh!) - Some platforms such as Zwift, RGT... don't record this data, even if you use a power meter that reports it.
