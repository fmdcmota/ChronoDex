# Gemini Argon High:
1) design a way to scrape images off Google Earth and Google Maps for a place across all the available time periods/eras. It should more so provide links to images rather than downloading each time since thats more efficient. It wshould tag each image in a json format which includes coordinates, era, date/time and anything else that could be useful. 

# Initial prompt for 
Image/video generation:
uses current location to generate past pictures of the location and create a 3D video environment to allow user to look around and see how the older days looked like

Voice generation:
creates a voice narrator for the historical fact, something about the daily life etc
talk to the avatar, avatar could answer as the narrator or answers as if the avatar is from that era

will use fal for voice and video generation mandatory! There is a prize in the hackathon for best use of fal.

Google earth/maps scraping - need to see access and API requirements or scraping
The app is going to be a website.

The main screen of the website will be a pokemon style map, which displays the various landmarks in the city, with a button to take a picture at the bottom of the screen.


The app will be split into 3 parts, which will be displayed one after the other - with a main menu
The Dex is a collection game: you earn an entry by standing where the old photograph was taken and retaking it.
The user will open the app, with an option to take a picture where they are - facing a landmark (location must be shared) - if they are within 50m of a landmark they’ll be able to collect the landmark badge, which will show on their main screen map
After taking the picture and collecting the dex, the user will be presented with a “time machine” screen, with a series of  eras (with a specific year) surroundings will be 1. Generated or 2. Loaded if they already exist.
The AR view will allow the user to look around on their phone and see a 360 view of the place they’re in at the time back in the day. A video will then start being generated, from the same place the AR view is. This video will have a narrator / tour guide from the era come walk up and give a ~45sec explanation of customs at the time, fun facts, etc. then walk off. The avatar will introduce himself with a name, and will have a time appropriate accent. A headshot of the avatar should also be generated as a profile picture for the chat agent in the next section
For each location, there will be an avatar that is related to the location/time era in a certain way. The avatar will use voice generation to narrate some facts related to the location, and will feature a chat option to text or use your voice to ask the agent questions about the location. The chat feature will be styled like text messages. The agent should be very nice and give extra fun facts about the region, and talk about other monuments to watch.



Idea to build:
Based on location, directs you towards specific hotspot sites where there is a historical location/data to create a historical view
Once at the location, creates an AR image overlaying historical image with the current view.
Provides a slider with images comparing over different time periods
Presents a video “day in history” that is an AI generated video of the location, based on previous video. Has narrator going through daily life + generates historical people. 

We're going to split development into 4 agents - and we need to make a dev plan and allocate tasks to each agent to thei tasks to ensure tasks are not repeated and development is as parallelized as possible

Use this rigid idea of what the appp is going to be like to make 1. A roadmap of what has to be developed and key points in development 2. Use the restriction of using fal in the best way possible 3. make a master MD file for all agents to use as context with all info required. 

Make a plan for what needs to be done first, so we can review your plan and so each agent knows their tasks and can always run if they're told which agents they are. 

make no mistakes