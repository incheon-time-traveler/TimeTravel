from rest_framework import serializers
from .models import Spot

# code here.
class SpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spot
        fields = '__all__'
