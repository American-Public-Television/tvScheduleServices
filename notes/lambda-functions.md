# What is needed?

`https://docs.pbs.org/space/tvsapi/3964930/TV+Schedules+Service+(TVSS)+API`

## createSchedule(callSign)

* makes POST req to PBS schedule services with station callsign
* get upcoming local schedule based on:
  * call letters
    * feed cid
  * date
  * show

## __ENDPOINTS__

* __station_info__
  * -09ucx{callsign}
    * GET -> station info

* __schedule_info__
  * https://tvss.services.pbs.org/tvss/{callsign}/day/{yyyymmdd}
    * GET -> station schedule for particular date
  * https://tvss.services.pbs.org/tvss/{callsign}/day/{yyyymmdd}/{feed_cid}
    * GET -> substation schedule for particular day
  * https://tvss.services.pbs.org/tvss/feed/{feed_cid}/day/{yyyymmdd}
    * GET -> substation schedule for particular day w/o callsign
  * https://tvss.services.pbs.org/tvss/{callsign}/day/{yyyymmdd}/?fetch-images
    * GET -> substation schedule for particular day w/o cid
  * https://tvss.services.pbs.org/tvss/{callsign}/today/

* __program_schedule_info__
  * https://tvss.services.pbs.org/tvss/{callsign}/upcoming/program/{tms_id} || {program_id}/
    * GET -> program schedule by id
  * https://tvss.services.pbs.org/tvss/{callsign}/upcoming/show/{episode_id} || {onetimeonly_id}/
    * GET -> episode schedule by id
  * https://tvss.services.pbs.org/tvss/{callsign}/upcoming/episode/{tms_id}/

* __station_schedule_info__
  * https://tvss.services.pbs.org/stations/{station_id}/

* __SEARCHES__
  * https://tvss.services.pbs.org/tvss/search/upcoming/{search_keyword}/
    * GET -> upcoming programs and episode w/ keyword
  * https://tvss.services.pbs.org/tvss/search/{search_keyword}/
    * GET -> programs and episode w/ keyword
  * https://tvss.services.pbs.org/tvss/{callsign}/search/upcoming/{search_keyword}/
    * GET -> upcoming programs and episode w/ callsign filter w/ keyword
  * https://tvss.services.pbs.org/tvss/{callsign}/search/{search_keyword}/
    * GET -> programs and episode w/ callsign filter w/ keyword
  * https://tvss.services.pbs.org/stations/search/{flagship_callsign} || {secondary_callsign}/
    * GET -> all sibling (flagship/primary callsign and secondary transmitter/repeater) callsigns
  * https://tvss.services.pbs.org/tvss/feed/{feed_cid}/search/upcoming/{search_keyword} `%20{search_keyword}...` __KEYWORDS MUST BE AN ARRAY__
    * GET -> get all programs and episodes w/ keyword(s) and cid
      * include `/upcoming` to get upcoming listings
  * https://tvss.services.pbs.org/tvss/{callsign}/search-kids/{search_keyword}/
    * GET -> Returns programs and episodes which have the search term/s in the title or descriptions.
      * include `/upcoming` for UPCOMING KIDS programs and episodes by callsign and keyword/s
  * https://tvss.services.pbs.org/tvss/{callsign}/channels/zip/{zip_code}/
    * GET -> channel feed
  *all listings are made kids with the addition of a trailing `/kids` param*

## NEEDS

*should get:*

* station info
  * station cid
  * cid <-> callsign
  * zip_code <-> callsign
* schedule
  * for station by date and cid
  * for station by date and callsign


## API Gateway endpoints

* /episode
* /kids
  * /date
  * /feed
  * /today
* /program
* /schedule
  * /date
  * /feed
  * /today
* /search
  * /callsign
  * /keyword
  * /upcoming_keyword
  * /upcoming_callsign
  * /siblings
  * /cid_keyword
  * /upcoming_cid_keyword
  * /kids
  * /upcoming_kids
  * /zip_feed
* /stations
