from django.db import models
from spots.models import Spot

class Route(models.Model):
    id = models.AutoField(primary_key=True)
    is_mission_available = models.BooleanField(default=False)
    mission_spot_count = models.IntegerField(default=0)
    user_region_name = models.CharField(max_length=100)
    total_spots = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class RouteSpot(models.Model):
    id = models.AutoField(primary_key=True)
    route_id = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='routespots')
    spot_id = models.ForeignKey(Spot, on_delete=models.CASCADE, related_name='routespots')
    order = models.IntegerField(null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('route_id', 'order')


class UserRouteSpot(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey('accounts.CustomUser', null=False, on_delete=models.CASCADE, related_name='userroutespots')
    route_id = models.ForeignKey(Route, null=False, on_delete=models.CASCADE, related_name='userroutespots')
    route_spot_id = models.ForeignKey(RouteSpot, null=False, on_delete=models.CASCADE, related_name='userroutespots')
    order = models.IntegerField(null=False)
    unlock_at = models.DateTimeField(null=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user_id', 'route_spot_id', 'route_id')