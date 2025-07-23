from django.shortcuts import render
from .models import Spot
from .serializers import SpotSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view

# Create your views here.
@api_view(['GET'])
def spots(request):
    spots = Spot.objects.all()
    serializer = SpotSerializer(spots, many=True)
    return Response(serializer.data, status=200)

@api_view(['GET'])
def spot_detail(request, spot_id):
    spot = Spot.objects.get(id=spot_id)
    serializer = SpotSerializer(spot)
    return Response(serializer.data, status=200)