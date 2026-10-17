---
'@tanrei/web': patch
---

A date-time picker wheel now carries on after a fling. Someone who flicks the hour, minute or period wheel and lets go
while it is still moving sees it run on past the nearest row and slow to a stop. Before, every drag settled on the row
nearest where it was let go, however fast it was moving. After a drag, a scroll or a press on a row, the wheel's value
is now taken once its rows have settled, not as soon as the pointer lifts or the scroll stops. A drag held still for
more than 40 ms before it is let go settles where it stopped, as before.
