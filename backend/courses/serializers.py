from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Route, RouteSpot, UserRouteSpot 


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'

class RouteDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteSpot
        fields = ['route_id', 'order_number', 'spot_id']