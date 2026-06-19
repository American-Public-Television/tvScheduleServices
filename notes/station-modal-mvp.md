# Station modal should:

1. Assess cookies on page load
   1. if no cookies -> Trigger on entry w/ zip filled and call sign options
   2. if station cookies -> set station based on them
      1. if station -> add donate link and display logo
2. Close button sets station as national after initial open, otherwise it just closes modal
3. Guidance text
   1. initial open -> closing button will show national
   2. changing zip and blurring will provide new callsign options
   3. clicking dismiss will display national
   4. warning if no CreateTV.com station in zip
4. Selecting station means createStation { "dismissed": true } is removed
5. Selecting station stores the following in cookies: **cookie names are important**
   1. channel_no
   2. headend_name -> provider (urlencoded)
   3. logo
   4. tvdata_name
   5. ucf
   6. zipcode -> this should be the user entered zip, NOT station zip
6. callsign swaps
7. clear provider if zip changed, getCallsigns