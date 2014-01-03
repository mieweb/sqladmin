:

export PATH=$PATH:~/.meteor/tools/latest/bin/

if hash mrt 2>/dev/null; then
        mrt
        exit
fi

if hash meteor 2>/dev/null; then
        echo "You are cool!  You installed meteor."
else
        curl https://install.meteor.com | /bin/sh
fi

if hash mrt 2>/dev/null; then
        echo "You are cool!  You installed mrt."
else
        npm install -g meteorite
fi

echo "ok, now you can just run meteor."
mrt

