# Pitch drafts — verify against the deployed version before speaking

## About 30 seconds

A line on a climate chart is easy to draw. Knowing what it tells us is harder. Trend Detective Lab lets students explore NASA temperature and precipitation records across Chile, see uncertainty, and test whether two regions really differ. In MERRA-2, Antofagasta warmed faster than Los Lagos, but other sources do not always agree. We help people understand what the evidence tells us—and where it falls short.

## About 90 seconds

Anyone can draw a trend line. But a climate record varies from year to year, and a result that is not statistically significant does not mean nothing is changing.

Trend Detective Lab is an open educational web app for exploring NASA temperature and precipitation data across Chile. Choose a guided case, inspect the record, and compare two regions. The app shows a trend, its uncertainty, and a direct test of the difference. All statistics come from our reproducible Python pipeline.

In the MERRA-2 reanalysis, Antofagasta warmed about 0.18 degrees Celsius per decade faster than Los Lagos between 1980 and 2025. That comparison has a p-value of about 0.006. But an Antofagasta weather station does not corroborate the regional temperature estimate. A station is one point, not a regional average.

Our simulations found that the final method still raises more false alarms than its nominal five-percent target in some scenarios. We disclose that limitation. This is a tool for learning to question evidence, not a forecast or proof of causes.

## About three minutes

Anyone can draw a line through a climate record. The difficult question is whether the apparent change is distinguishable from the variability in the data. That matters in the classroom and whenever people use climate information to reason about their communities.

Trend Detective Lab is an open web app for investigating that question. It uses NASA MERRA-2 reanalysis for air temperature and GPM IMERG satellite-and-gauge estimates for precipitation across Chile's sixteen regions. These are different kinds of products, not perfect measurements at every location.

Start with a guided case. In the temperature comparison, we select Los Lagos and Antofagasta. The app displays the monthly record, yearly averages, a trend and its confidence interval. Los Lagos has an estimated increase of about 0.05 degrees Celsius per decade; the interval includes zero. Antofagasta's estimate is about 0.23. Instead of inferring a difference from two separate labels, the app tests the difference directly. In MERRA-2 it is about 0.18 degrees per decade, with a p-value of 0.006. The regional Antofagasta estimate is not corroborated by the station we checked, so the result needs context.

A second case compares precipitation in Los Lagos and Magallanes. IMERG shows a significant decline in Magallanes, but the difference between the two regional trends is not significant. Furthermore, ERA5 and the Punta Arenas station do not fully confirm the Magallanes decline. Different sources have different spatial coverage and assumptions; their disagreement is information, not something to hide.

We documented our methods before accessing the data, then revised the test after simulations revealed too many false alarms. Our annual method still exceeded the nominal five-percent rate in some simulated scenarios. It can miss real changes too, and its interval does not include all product uncertainty. The app discloses these limits and links to the sources and code.

Students and teachers can use this focused workflow to practice asking a sharper question: what is changing, where, how fast, and how certain are we? We don't just show climate trends. We help people understand what the evidence really tells us.

Timing is approximate; rehearse aloud and update figures after any data rebuild.
