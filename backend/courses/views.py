from django.shortcuts import render, get_object_or_404
from rest_framework.response import Response
from .models import Route, RouteSpot
from .serializers import RouteSerializer, RouteDetailSerializer
from rest_framework.decorators import api_view


# Create your views here.
@api_view(['GET', 'POST'])
def routes(request):
    if request.method == 'POST':
        serializer = RouteSerializer(data=request.data['route'])
        if serializer.is_valid():
            serializer.save()
            for spot in request.data['spots']:
                RouteSpot.objects.create(route_id=serializer.data['id'], spot_id=spot['id'], order_number=spot['order_number'])
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400) 
    else:
        routes = Route.objects.all()
        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data, status=200)

@api_view(['GET'])
def route_detail(request, route_id):
    route_spots = get_object_or_404(RouteSpot, route_id=route_id)
    serializer = RouteDetailSerializer(route_spots, many=True)
    return Response(serializer.data, status=200)
